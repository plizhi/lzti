#!/usr/bin/env node
/**
 * 虾哥协议兼容的 WebSocket 服务端。
 *
 * 目的：让 xiaozhi-esp32 固件原样连上来（路径 B），服务端把虾哥协议翻译成
 * 我们自己的 device API（HTTP），测评逻辑一行都不重复实现。
 *
 * 单独起一个进程，不改动主应用的构建/部署流程：
 *   node server.mjs
 *
 * 环境变量：
 *   WS_PORT            监听端口（默认 3020）
 *   LZTI_BASE_URL      主应用地址（默认 http://localhost:3010）
 *   FFMPEG_PATH        ffmpeg 路径（默认 /usr/bin/ffmpeg）
 *   WS_SILENCE_TIMEOUT_MS  静默兜底阈值（默认 1200）
 *   LOG_LEVEL          debug | info | warn | error
 */

import http from 'http';
import { WebSocketServer } from 'ws';
import { config } from './src/config.mjs';
import { createLogger } from './src/logger.mjs';
import { LztiClient } from './src/lzti-client.mjs';
import { DeviceSession } from './src/session.mjs';
import { extractDeviceToken } from './src/protocol.mjs';

const log = createLogger('ws');
const client = new LztiClient();

/** 活跃连接数 */
let connectionCount = 0;

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'lzti-ws-server',
      connections: connectionCount,
      lztiBaseUrl: config.lztiBaseUrl,
      time: new Date().toISOString(),
    }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ status: 'error', message: 'not found' }));
});

const wss = new WebSocketServer({
  noServer: true,
  /**
   * 在 HTTP 升级阶段就校验设备令牌。
   *
   * 虾哥固件握手时会带 4 个头（websocket_protocol.cc:97-106）：
   *   Authorization: Bearer <deviceToken>
   *   Protocol-Version: 2 | 3
   *   Device-Id: <MAC>
   *   Client-Id: <UUID>
   *
   * 令牌无效时直接回 HTTP 401，固件会打印明确的错误，而不是连上再被踢掉。
   */
  verifyClient: async (info, cb) => {
    const req = info.req;
    const token = extractDeviceToken(req.headers['authorization']);
    if (!token) {
      cb(false, 401, 'Unauthorized', { 'Content-Type': 'application/json; charset=utf-8' });
      return;
    }
    try {
      req.deviceIdentity = await client.ping(token);
      cb(true);
    } catch (err) {
      log.warn('设备令牌校验失败:', err.message);
      cb(false, 401, 'Unauthorized', { 'Content-Type': 'application/json; charset=utf-8' });
    }
  },
});

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws, req) => {
  connectionCount += 1;
  const session = new DeviceSession({ ws, request: req, client });

  log.info(
    `新连接 device=${session.deviceLabel} clientId=${session.clientId || '-'} ` +
    `protocol=v${session.protocolVersion} session=${session.sessionId || '-'} ` +
    `active=${connectionCount}`
  );

  ws.on('message', (data, isBinary) => {
    session.handleMessage(data, isBinary);
  });

  ws.on('close', (code, reason) => {
    connectionCount -= 1;
    session.close();
    log.info(
      `连接关闭 device=${session.deviceLabel} code=${code} ` +
      `reason=${reason?.toString?.() || ''} active=${connectionCount}`
    );
  });

  ws.on('error', (err) => {
    log.error('WebSocket 错误:', err.message);
  });

  // 固件的连接可能长时间空闲，放宽心跳超时
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  session.start().catch((err) => {
    log.error('会话初始化失败:', err);
  });
});

/** 心跳巡检：踢掉半开连接 */
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      /* ignore */
    }
  }
}, 30000);

wss.on('close', () => clearInterval(heartbeat));

server.listen(config.port, config.host, () => {
  log.info(`虾哥协议 WebSocket 服务已启动 ws://${config.host}:${config.port}`);
  log.info(`主应用地址 ${config.lztiBaseUrl}，ffmpeg ${config.ffmpegPath}`);
  log.info(`下行音频 ${config.downlinkSampleRate}Hz / ${config.downlinkFrameDurationMs}ms Opus`);
});

function shutdown(signal) {
  log.info(`收到 ${signal}，准备退出`);
  clearInterval(heartbeat);
  for (const ws of wss.clients) {
    try {
      ws.close(1001, 'server shutting down');
    } catch {
      /* ignore */
    }
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  log.error('未处理的 Promise 拒绝:', err);
});
