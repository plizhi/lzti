/**
 * ws-server 配置
 *
 * 全部通过环境变量覆盖，默认值面向本地开发（lzti-dev 跑在 3010）。
 */

function num(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function str(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

export const config = {
  /** 监听端口 */
  port: num(process.env.WS_PORT, 3020),
  host: str(process.env.WS_HOST, '0.0.0.0'),

  /** 主应用（Next.js）地址，ws-server 通过 HTTP 复用它的 device API */
  lztiBaseUrl: str(process.env.LZTI_BASE_URL, 'http://localhost:3010').replace(/\/+$/, ''),

  /** ffmpeg 路径，用于 mp3 → opus 转码 */
  ffmpegPath: str(process.env.FFMPEG_PATH, '/usr/bin/ffmpeg'),

  /** 一句话结束判定：多久没有新音频帧就认为说完了（毫秒） */
  silenceTimeoutMs: num(process.env.WS_SILENCE_TIMEOUT_MS, 1200),

  /** 单次上传音频上限（与 /api/device/voice/answer 的 5MB 限制对齐） */
  maxUtteranceBytes: num(process.env.WS_MAX_UTTERANCE_BYTES, 5 * 1024 * 1024),

  /**
   * 下行音频参数。
   *
   * 虾哥固件在收到服务端 hello 后，用 audio_params 里的 sample_rate / frame_duration
   * 重建 Opus 解码器（main/audio/audio_service.cc:532 SetDecodeSampleRate）。
   * 所以这两个值必须与我们在 SendAudio 里发的 Opus 帧一致，否则解码器会解错。
   */
  downlinkSampleRate: num(process.env.WS_DOWNLINK_SAMPLE_RATE, 24000),
  downlinkFrameDurationMs: num(process.env.WS_DOWNLINK_FRAME_DURATION_MS, 60),

  /**
   * 下行帧间隔（毫秒）。等于帧长 = 实时速率下发。
   *
   * 固件的播放队列只有 2 个槽（MAX_PLAYBACK_TASKS_IN_QUEUE），
   * 解码队列 20 个槽（MAX_DECODE_PACKETS_IN_QUEUE = 1200/60）。
   * 一次性把整段音频喷过去会爆队列丢帧，所以必须按实时速率匀速下发。
   */
  frameIntervalMs: num(process.env.WS_FRAME_INTERVAL_MS, 60),

  /** tts start 与第一帧音频之间的等待（毫秒）。
   *  固件收到 tts start 后要经过 Schedule 切到 Speaking 状态才收解码队列，
   *  太早发帧会被直接丢掉。 */
  speakLeadInMs: num(process.env.WS_SPEAK_LEAD_IN_MS, 200),

  /** 日志级别：debug | info | warn | error */
  logLevel: str(process.env.LOG_LEVEL, 'info'),

  /**
   * 应用层保活间隔（毫秒）。
   *
   * 虾哥固件在 Protocol::IsTimeout() 里判断「120 秒没收到任何数据就认为通道超时」，
   * 超时后 IsAudioChannelOpened() 返回 false，设备会断开重连。
   * WebSocket 层的 ping 不算（固件只在 OnData 里刷新 last_incoming_time_），
   * 所以这里要定期发一条应用层 JSON 保活。
   */
  keepaliveIntervalMs: num(process.env.WS_KEEPALIVE_INTERVAL_MS, 60000),
};
