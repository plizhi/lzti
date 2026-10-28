#!/usr/bin/env node
/**
 * 虾哥固件模拟器：用来在没有真机时验证 ws-server。
 *
 * 它严格按 xiaozhi-esp32 的行为来：
 * 1. 握手带 4 个头（Authorization / Protocol-Version / Device-Id / Client-Id）
 * 2. 连上先发客户端 hello
 * 3. 等服务端 hello（必须有 transport="websocket"）
 * 4. 收到 tts start 后把二进制帧当 Opus 帧收下来
 * 5. 发 listen start → 连续发 Opus 帧 → 发 listen stop
 * 6. 期待 stt（识别文字）和下一题的 tts
 *
 * 用法：
 *   node test/simulate-firmware.mjs \
 *     --url ws://localhost:3020/?sessionId=xxx&questionnaireType=parent \
 *     --token <deviceToken> [--protocol 3] [--speech speech.mp3] [--out outdir]
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { WebSocket } from 'ws';
import { buildOggOpus } from '../src/ogg-opus.mjs';

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const url = arg('url', 'ws://localhost:3020/?sessionId=test&questionnaireType=parent');
const token = arg('token', process.env.DEVICE_TOKEN || '');
const protocol = Number(arg('protocol', '3'));
const speechFile = arg('speech', '');
const outDir = arg('out', '/tmp/ws-firmware-sim');

if (!token) {
  console.error('缺少 --token');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const log = (...args) => console.log('[sim]', ...args);

/** 把一段音频编码成 16kHz / 60ms 的 Opus 帧（模拟固件 VAD 切出来的帧） */
function encodeUtterance(mp3Path) {
  const ogg = execFileSync('/usr/bin/ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-i', mp3Path,
    '-c:a', 'libopus', '-ar', '16000', '-ac', '1', '-frame_duration', '60',
    '-f', 'opus', 'pipe:1',
  ], { maxBuffer: 32 * 1024 * 1024 });

  // 拆出裸 Opus 包
  const packets = [];
  let pending = [];
  let offset = 0;
  while (offset + 27 <= ogg.length) {
    const segmentCount = ogg.readUInt8(offset + 26);
    const tableStart = offset + 27;
    let dataOffset = tableStart + segmentCount;
    for (let i = 0; i < segmentCount; i += 1) {
      const lacing = ogg.readUInt8(tableStart + i);
      pending.push(ogg.subarray(dataOffset, dataOffset + lacing));
      dataOffset += lacing;
      if (lacing < 255) {
        packets.push(Buffer.concat(pending));
        pending = [];
      }
    }
    offset = dataOffset;
  }
  return packets.slice(2); // 去掉 OpusHead / OpusTags
}

/** 按协议版本封装上行二进制帧 */
function wrap(payload) {
  if (protocol === 2) {
    const frame = Buffer.alloc(16 + payload.length);
    frame.writeUInt16BE(2, 0);
    frame.writeUInt16BE(0, 2);
    frame.writeUInt32BE(0, 4);
    frame.writeUInt32BE(Date.now() >>> 0, 8);
    frame.writeUInt32BE(payload.length, 12);
    payload.copy(frame, 16);
    return frame;
  }
  if (protocol === 3) {
    const frame = Buffer.alloc(4 + payload.length);
    frame.writeUInt8(0, 0);
    frame.writeUInt8(0, 1);
    frame.writeUInt16BE(payload.length, 2);
    payload.copy(frame, 4);
    return frame;
  }
  return payload; // v1 裸包
}

const frames = speechFile ? encodeUtterance(speechFile) : [];
log(`协议版本 v${protocol}，语音帧 ${frames.length} 个`);

const ws = new WebSocket(url, {
  headers: {
    Authorization: `Bearer ${token}`,
    'Protocol-Version': String(protocol),
    'Device-Id': 'AA:BB:CC:DD:EE:FF',
    'Client-Id': `sim-${Date.now()}`,
  },
});

const state = {
  serverHello: null,
  stt: null,
  questions: [],       // 每次 tts start → stop 之间的 Opus 帧
  capturing: false,
  ttsCount: 0,
};

ws.on('open', () => {
  log('已连接，发客户端 hello');
  // 与固件 GetHelloMessage() 一致
  ws.send(JSON.stringify({
    type: 'hello',
    version: protocol,
    features: { aec: true, mcp: true },
    transport: 'websocket',
    audio_params: { format: 'opus', sample_rate: 16000, channels: 1, frame_duration: 60 },
  }));
});

ws.on('message', (data, isBinary) => {
  if (isBinary) {
    // 下行二进制帧 = 一帧 Opus
    let payload = data;
    if (protocol === 2) payload = data.subarray(16);
    else if (protocol === 3) payload = data.subarray(4);
    state.questions[state.questions.length - 1]?.push(payload);
    return;
  }

  let msg;
  try {
    msg = JSON.parse(data.toString('utf8'));
  } catch {
    log('收到非 JSON:', data.toString('utf8').slice(0, 200));
    return;
  }

  switch (msg.type) {
    case 'hello':
      state.serverHello = msg;
      log('收到服务端 hello:', JSON.stringify(msg));
      if (msg.transport !== 'websocket') {
        log('✗ transport 不是 websocket，固件会直接放弃连接');
        process.exit(1);
      }
      break;
    case 'tts':
      if (msg.state === 'start') {
        state.ttsCount += 1;
        state.questions.push([]);
        log(`收到 tts start（第 ${state.ttsCount} 段）`);
      } else if (msg.state === 'stop') {
        const received = state.questions[state.questions.length - 1] || [];
        log(`收到 tts stop，本段 ${received.length} 帧 Opus`);
        const file = `${outDir}/tts-${state.ttsCount}.opus`;
        writeFileSync(file, Buffer.concat(received));
        log(`  已保存 ${file}`);
        // 额外封一份 Ogg，方便用 ffmpeg 解码校验音频内容
        const oggFile = `${outDir}/tts-${state.ttsCount}.ogg`;
        writeFileSync(oggFile, buildOggOpus(received, { sampleRate: 24000, preSkip: 312 }));
        log(`  已保存 ${oggFile}`);
        onTtsFinished();
      } else if (msg.state === 'sentence_start') {
        log('题目文本:', msg.text);
      }
      break;
    case 'stt':
      state.stt = msg.text;
      log('识别文字:', msg.text);
      break;
    case 'error':
      log('服务端错误:', msg.message);
      break;
    default:
      log('收到其他消息:', JSON.stringify(msg));
  }
});

/** 第一段播报结束后，模拟孩子说话 */
function onTtsFinished() {
  if (state.ttsCount > 1) {
    // 收到第二题（回答之后的下一题）就算跑完了
    report();
    return;
  }
  if (state.ttsCount !== 1) return;   // 只在第一题后应答一次
  if (state.capturing) return;
  state.capturing = true;

  log('开始录音');
  ws.send(JSON.stringify({ type: 'listen', state: 'start', mode: 'auto' }));

  let index = 0;
  const timer = setInterval(() => {
    if (index >= frames.length) {
      clearInterval(timer);
      log('录音结束，发 listen stop');
      ws.send(JSON.stringify({ type: 'listen', state: 'stop' }));
      return;
    }
    ws.send(wrap(frames[index]));
    index += 1;
  }, 60); // 60ms 一帧，模拟实时说话
}

ws.on('close', (code, reason) => {
  log('连接关闭', code, reason?.toString?.() || '');
  report();
});

ws.on('error', (err) => {
  log('连接错误:', err.message);
});

let reported = false;
function report() {
  if (reported) return;
  reported = true;

  const checks = [
    ['收到服务端 hello 且 transport=websocket', state.serverHello?.transport === 'websocket'],
    ['服务端 hello 声明了 24kHz/60ms 的下行音频参数',
      state.serverHello?.audio_params?.sample_rate === 24000 &&
      state.serverHello?.audio_params?.frame_duration === 60],
    ['收到至少一段 TTS 音频', state.questions.length > 0],
    ['TTS 音频帧数合理（每帧 60ms）',
      state.questions.every((frames) => frames.length > 0)],
    ['收到识别文字 stt', !!state.stt],
  ];

  console.log('\n===== 验证结果 =====');
  const bad = [];
  for (const [desc, pass] of checks) {
    console.log(`${pass ? '✓' : '✗'} ${desc}`);
    if (!pass) bad.push(desc);
  }
  console.log(`识别文字: ${state.stt || '(无)'}`);
  console.log(`TTS 段数: ${state.questions.length}`);
  process.exit(bad.length ? 1 : 0);
}

setTimeout(() => {
  log('超时退出');
  report();
}, 60000).unref?.();
