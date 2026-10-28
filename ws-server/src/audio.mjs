/**
 * 音频转码：MiniMax TTS 的 mp3 → 虾哥固件能解的 Opus 帧。
 *
 * 为什么必须转：
 * - 我们服务端只有 MiniMax TTS，输出格式是 mp3（src/lib/minimax-tts.ts）。
 * - 虾哥固件的下行解码器是 esp_opus_dec（main/audio/audio_service.cc:426），
 *   只吃裸 Opus 包，不认识 mp3。
 * - 所以服务端必须把 mp3 转成 24kHz / 60ms 的 Opus 包再下发。
 *
 * 上行反方向：设备发上来的是裸 Opus 包（16kHz），
 * 而 MiniMax ASR 只接受带容器的 Opus（Ogg Opus），裸包流会被拒（实测 400 / 2013），
 * 所以上行要先把裸包重新封成 Ogg，见 ogg-opus.mjs。
 */

import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { config } from './config.mjs';
import { extractOpusFrames } from './ogg-opus.mjs';

/**
 * 跑一次 ffmpeg，输入输出都走管道。
 *
 * @param {string[]} args ffmpeg 参数
 * @param {Buffer} input stdin 内容
 * @returns {Promise<Buffer>} stdout 内容
 */
export function runFfmpeg(args, input) {
  return new Promise((resolve, reject) => {
    const proc = spawn(config.ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    let settled = false;

    proc.stdout.on('data', (chunk) => stdout.push(chunk));
    proc.stderr.on('data', (chunk) => stderr.push(chunk));
    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(new Error(`ffmpeg 启动失败：${err.message}`));
    });
    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (code !== 0) {
        const detail = Buffer.concat(stderr).toString('utf8').trim();
        reject(new Error(`ffmpeg 退出码 ${code}：${detail}`));
        return;
      }
      resolve(Buffer.concat(stdout));
    });

    proc.stdin.on('error', () => {}); // ffmpeg 提前退出时忽略 EPIPE
    proc.stdin.end(input);
  });
}

/**
 * mp3 → 24kHz 单声道 60ms Opus 包数组。
 *
 * 参数对齐虾哥固件：
 * - 采样率 24000 → 服务端 hello 里声明的 audio_params.sample_rate，
 *   固件据此重建解码器（audio_service.cc:532 SetDecodeSampleRate）。
 * - 帧长 60ms → OPUS_FRAME_DURATION_MS（audio_service.h:40）。
 *
 * @param {Buffer} mp3
 * @returns {Promise<Buffer[]>} 每个元素是一个 Opus 包
 */
export async function mp3ToOpusFrames(mp3) {
  if (!mp3 || mp3.length === 0) return [];

  const ogg = await runFfmpeg([
    '-hide_banner',
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-c:a', 'libopus',
    '-ar', String(config.downlinkSampleRate),
    '-ac', '1',
    '-frame_duration', String(config.downlinkFrameDurationMs),
    '-application', 'audio',
    '-f', 'opus',
    'pipe:1',
  ], mp3);

  return extractOpusFrames(ogg);
}

/**
 * 转码结果缓存。
 *
 * 同一道题的播报音频会被反复请求（重念、断线重连），
 * 转码一次几十毫秒，缓存后可以省掉。
 */
const frameCache = new Map();
const FRAME_CACHE_MAX = 64;

export function clearFrameCache() {
  frameCache.clear();
}

/**
 * 带缓存的 mp3 → Opus 帧。
 *
 * @param {Buffer} mp3
 * @returns {Promise<Buffer[]>}
 */
export async function mp3ToOpusFramesCached(mp3) {
  if (!mp3 || mp3.length === 0) return [];
  const key = createHash('sha256').update(mp3).digest('hex');
  const hit = frameCache.get(key);
  if (hit) return hit;

  const frames = await mp3ToOpusFrames(mp3);
  if (frameCache.size >= FRAME_CACHE_MAX) {
    // 简单淘汰最早插入的一条
    const oldest = frameCache.keys().next().value;
    frameCache.delete(oldest);
  }
  frameCache.set(key, frames);
  return frames;
}
