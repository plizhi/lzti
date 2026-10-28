/**
 * 单个设备连接的会话状态机。
 *
 * 我们的服务端不是通用 AI 助手，是一个「测评应用」：
 *   连接 → 服务端念第一题 → 设备录音 → 设备说停 → 服务端识别 → 落进度 → 念下一题
 *
 * 与虾哥协议的对应关系：
 * - 握手：普通 WebSocket + Authorization / Protocol-Version / Device-Id / Client-Id 四个头
 *   （固件 main/protocols/websocket_protocol.cc:97-106）
 * - 服务端要先发 hello，且必须带 transport="websocket"，
 *   否则固件 ParseServerHello 直接 return，10 秒后连接失败
 *   （websocket_protocol.cc:236-266）
 * - 固件发来的文本 JSON 里 {"type":"listen","state":"start"|"stop"} 是「开始/结束说话」信号
 *   （main/protocols/protocol.cc:82-100）
 * - 固件发来的二进制帧是 Opus 包（16kHz，60ms 一帧），一句话由连续多帧组成
 *   （websocket_protocol.cc:24-54）
 */

import { config } from './config.mjs';
import { createLogger } from './logger.mjs';
import {
  buildServerHello,
  buildStt,
  buildTtsSentenceStart,
  buildTtsState,
  encodeBinaryFrame,
  extractDeviceToken,
  FRAME_TYPE,
  parseBinaryFrame,
  PROTOCOL_V1,
} from './protocol.mjs';
import { mp3ToOpusFramesCached } from './audio.mjs';
import { buildOggOpus } from './ogg-opus.mjs';

const log = createLogger('session');

/** WebSocket 关闭码：鉴权失败 */
export const CLOSE_UNAUTHORIZED = 4401;
/** WebSocket 关闭码：参数不完整（缺 sessionId 等） */
export const CLOSE_BAD_REQUEST = 4400;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class DeviceSession {
  /**
   * @param {object} options
   * @param {import('ws').WebSocket} options.ws
   * @param {import('http').IncomingMessage} options.request
   * @param {import('./lzti-client.mjs').LztiClient} options.client
   * @param {(mp3: Buffer) => Promise<Buffer[]>} [options.toOpusFrames] mp3 → Opus 帧，默认走 ffmpeg
   */
  constructor({ ws, request, client, toOpusFrames }) {
    this.ws = ws;
    this.request = request;
    this.client = client;
    this.toOpusFrames = toOpusFrames || mp3ToOpusFramesCached;
    this.logger = log;

    const url = new URL(request.url || '/', 'http://localhost');
    this.sessionId = url.searchParams.get('sessionId') || '';
    this.questionnaireType = url.searchParams.get('questionnaireType') || 'parent';

    this.token = extractDeviceToken(request.headers['authorization']);
    this.protocolVersion = Number(request.headers['protocol-version']) || PROTOCOL_V1;
    this.deviceId = request.headers['device-id'] || '';
    this.clientId = request.headers['client-id'] || '';

    /** 累积的一句话（裸 Opus 包） */
    this.frames = [];
    this.frameBytes = 0;
    /** 静默兜底定时器 */
    this.silenceTimer = null;
    /** 正在处理一句话（避免并发处理两次） */
    this.busy = false;
    /** 已关闭 */
    this.closed = false;
    /** 下行时间戳（毫秒） */
    this.timestamp = 0;
    /** 会话标识，发给固件 */
    this.channelSessionId = `lzti-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    /** 身份信息 */
    this.identity = null;
    /** 最后一次向固件发数据的时间（用于保活） */
    this.lastSentAt = 0;
    /** 保活定时器 */
    this.keepaliveTimer = null;
  }

  get deviceLabel() {
    return this.deviceId || this.clientId || 'unknown-device';
  }

  /** 发送 JSON 文本帧 */
  sendJson(obj) {
    if (this.closed || this.ws.readyState !== this.ws.OPEN) return;
    this.ws.send(JSON.stringify(obj));
    this.lastSentAt = Date.now();
  }

  /** 发送一个 Opus 二进制帧 */
  sendOpusFrame(payload) {
    if (this.closed || this.ws.readyState !== this.ws.OPEN) return;
    const frame = encodeBinaryFrame(
      { type: FRAME_TYPE.OPUS, payload, timestamp: this.timestamp >>> 0 },
      this.protocolVersion
    );
    this.timestamp += config.downlinkFrameDurationMs;
    this.ws.send(frame);
    this.lastSentAt = Date.now();
  }

  /**
   * 应用层保活。
   *
   * 固件 120 秒收不到任何数据就把通道判为超时（protocol.cc:108 IsTimeout），
   * 之后 IsAudioChannelOpened() 返回 false，设备会断开重连。
   * WebSocket 层的 ping 不算，固件只在收到「数据帧」时刷新计时，
   * 所以这里定时发一条固件不认识的 JSON（它只会打一行 warning）。
   */
  startKeepalive() {
    if (this.keepaliveTimer) return;
    this.keepaliveTimer = setInterval(() => {
      if (this.closed) return;
      const idle = Date.now() - this.lastSentAt;
      if (idle >= config.keepaliveIntervalMs) {
        this.sendJson({ type: 'ping' });
      }
    }, Math.max(1000, Math.floor(config.keepaliveIntervalMs / 2)));
    this.keepaliveTimer.unref?.();
  }

  /**
   * 连接建立后的初始化：鉴权 → 发服务端 hello → 问第一题。
   *
   * 正常情况下鉴权已经在 upgrade 阶段做完了（见 server.mjs 的 verifyClient），
   * 身份信息挂在 request.deviceIdentity 上；这里只在没有该字段时兜底自己查一次。
   */
  async start() {
    if (!this.token) {
      this.logger.warn('缺少 Authorization 头');
      this.sendJson({ type: 'error', message: '缺少设备令牌' });
      this.ws.close(CLOSE_UNAUTHORIZED, 'missing authorization');
      return;
    }
    if (!this.sessionId) {
      this.sendJson({ type: 'error', message: '缺少 sessionId（请在 WebSocket URL 的 query 里带上）' });
      this.ws.close(CLOSE_BAD_REQUEST, 'missing sessionId');
      return;
    }

    if (this.request.deviceIdentity) {
      this.identity = this.request.deviceIdentity;
    } else {
      try {
        this.identity = await this.client.ping(this.token);
      } catch (err) {
        this.logger.error('设备令牌校验失败:', err.message);
        this.sendJson({ type: 'error', message: '设备未授权' });
        this.ws.close(CLOSE_UNAUTHORIZED, 'device unauthorized');
        return;
      }
    }

    this.logger.info(
      `连接成功 device=${this.deviceLabel} deviceId=${this.identity.deviceId} ` +
      `userId=${this.identity.userId} protocol=v${this.protocolVersion} session=${this.sessionId}`
    );

    // 服务端 hello：transport 必须是 "websocket"，否则固件直接放弃连接
    this.sendJson(buildServerHello({
      sessionId: this.channelSessionId,
      sampleRate: config.downlinkSampleRate,
      frameDurationMs: config.downlinkFrameDurationMs,
    }));

    this.startKeepalive();

    // 主动问第一题
    await this.askNextQuestion();
  }

  /**
   * 取下一题并念出来。
   */
  async askNextQuestion() {
    try {
      const next = await this.client.voiceNext(this.token, {
        sessionId: this.sessionId,
        questionnaireType: this.questionnaireType,
      });
      await this.speak(next.prompt, next.audioBase64);
    } catch (err) {
      this.logger.error('取下一题失败:', err.message);
      this.sendJson({ type: 'error', message: `取题失败：${err.message}` });
    }
  }

  /**
   * 下发一段 TTS 音频。
   *
   * 时序（固件侧要求）：
   *   tts start → （等固件切到 Speaking 状态）→ 二进制 Opus 帧 → tts stop
   *
   * 固件的播放队列只有 2 个槽、解码队列 20 个槽，
   * 一次性喷完会丢帧，所以按 60ms 一帧的实时速率下发。
   */
  async speak(text, audioBase64) {
    if (!audioBase64) return;
    const mp3 = Buffer.from(audioBase64, 'base64');
    if (mp3.length === 0) return;

    let frames;
    try {
      frames = await this.toOpusFrames(mp3);
    } catch (err) {
      this.logger.error('mp3 → opus 转码失败:', err.message);
      this.sendJson({ type: 'error', message: '音频转码失败' });
      return;
    }
    if (frames.length === 0) return;

    this.sendJson(buildTtsState('start'));
    if (text) {
      // sentence_start 会把文本显示到固件屏幕上
      this.sendJson(buildTtsSentenceStart(text));
    }

    // 等固件把状态切到 Speaking，否则它会把音频帧直接丢掉
    await sleep(config.speakLeadInMs);

    const started = Date.now();
    for (let i = 0; i < frames.length; i += 1) {
      const due = started + i * config.frameIntervalMs;
      const wait = due - Date.now();
      if (wait > 0) await sleep(wait);
      this.sendOpusFrame(frames[i]);
    }

    this.sendJson(buildTtsState('stop'));
    this.logger.info(`已下发 ${frames.length} 帧 Opus（${config.downlinkSampleRate}Hz/${config.downlinkFrameDurationMs}ms）`);
  }

  /** WebSocket 消息入口 */
  handleMessage(data, isBinary) {
    try {
      if (isBinary) {
        this.handleBinary(data);
      } else {
        this.handleText(data.toString('utf8'));
      }
    } catch (err) {
      this.logger.error('处理消息失败:', err);
    }
  }

  /** 处理固件发来的文本 JSON */
  handleText(text) {
    let msg;
    try {
      msg = JSON.parse(text);
    } catch {
      this.logger.warn('收到非 JSON 文本帧:', text.slice(0, 200));
      return;
    }

    switch (msg.type) {
      case 'hello':
        this.logger.info(
          `收到客户端 hello version=${msg.version} audio=${JSON.stringify(msg.audio_params || {})}`
        );
        break;
      case 'listen':
        if (msg.state === 'start') {
          this.beginUtterance();
        } else if (msg.state === 'stop') {
          this.flushUtterance('listen-stop');
        } else if (msg.state === 'detect') {
          this.logger.info('收到唤醒词:', msg.text || '');
        }
        break;
      case 'abort':
        this.logger.info('收到 abort，丢弃当前一句话');
        this.resetUtterance();
        break;
      default:
        this.logger.info('收到未识别的 JSON:', JSON.stringify(msg).slice(0, 200));
    }
  }

  /** 处理固件发来的二进制帧 */
  handleBinary(data) {
    const frame = parseBinaryFrame(data, this.protocolVersion);
    if (!frame) {
      this.logger.warn('二进制帧过短，已忽略');
      return;
    }

    if (frame.type === FRAME_TYPE.JSON) {
      // 二进制帧里塞 JSON 的情况
      try {
        this.handleText(frame.payload.toString('utf8'));
      } catch {
        this.logger.warn('二进制 JSON 帧解析失败');
      }
      return;
    }

    if (this.busy) {
      // 正在处理上一句，这期间的音频直接丢（设备此时应该在播报，不该在录音）
      this.logger.warn('处理中，丢弃音频帧');
      return;
    }

    if (frame.payload.length === 0) return;
    if (this.frameBytes + frame.payload.length > config.maxUtteranceBytes) {
      this.logger.warn('单句音频超过上限，丢弃');
      this.resetUtterance();
      return;
    }

    this.frames.push(frame.payload);
    this.frameBytes += frame.payload.length;
    this.armSilenceTimer();
  }

  /** 开始一句话：清空缓冲 */
  beginUtterance() {
    this.resetUtterance();
    this.logger.info('开始录音');
  }

  /** 清空缓冲并停掉静默定时器 */
  resetUtterance() {
    this.frames = [];
    this.frameBytes = 0;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /** 静默兜底：超过阈值没有新帧就认为说完了 */
  armSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.silenceTimer = null;
      this.flushUtterance('silence-timeout');
    }, config.silenceTimeoutMs);
  }

  /**
   * 一句话结束：送去识别 → 落进度 → 念下一题。
   */
  async flushUtterance(reason) {
    if (this.busy) return;
    if (this.frames.length === 0) return;

    const frames = this.frames;
    this.frames = [];
    this.frameBytes = 0;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    this.busy = true;
    const started = Date.now();
    try {
      // 裸 Opus 包流 MiniMax ASR 不认（实测 400 / 2013），必须重新封成 Ogg Opus
      const ogg = buildOggOpus(frames, { sampleRate: 16000, preSkip: 312 });

      const data = await this.client.voiceAnswer(this.token, {
        sessionId: this.sessionId,
        questionnaireType: this.questionnaireType,
        audioBytes: ogg,
      });

      this.logger.info(
        `识别完成(${reason}) 文本="${data.recognizedText || ''}" ` +
        `采纳=${data.accepted} 重念=${data.retry} 答完=${data.finished} 用时=${Date.now() - started}ms`
      );

      if (data.recognizedText) {
        // stt 会显示到固件屏幕上（application.cc 的 stt 分支）
        this.sendJson(buildStt(data.recognizedText));
      }

      if (data.next) {
        await this.speak(data.next.prompt, data.next.audioBase64);
      }
    } catch (err) {
      this.logger.error('处理一句话失败:', err.message);
      this.sendJson({ type: 'error', message: `处理失败：${err.message}` });
    } finally {
      this.busy = false;
    }
  }

  /** 连接关闭 */
  close() {
    this.closed = true;
    this.resetUtterance();
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }
}
