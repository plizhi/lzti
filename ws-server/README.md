# lzti-ws-server

虾哥 xiaozhi-esp32 协议兼容的 WebSocket 服务端（**路径 B**：固件不改代码，我们的服务端说虾哥的协议）。

配套文档：`docs/device-integration.md`（设备接入总览）、`docs/语音交互测评方案.md`（语音流程设计）。

---

## 一、它解决什么问题

固件复用虾哥 `xiaozhi-esp32`。虾哥固件只会说虾哥协议，而我们的服务端说的是自己的 HTTP device API。
本服务站在中间做翻译：

```
┌────────────────┐   虾哥 WebSocket 协议    ┌──────────────┐   我们自己的 HTTP API   ┌──────────────┐
│ ESP32 答题手柄  │ ───────────────────────► │  lzti-ws-   │ ──────────────────────► │  lzti 主应用  │
│ (xiaozhi 固件)  │ ◄─────────────────────── │  server      │ ◄────────────────────── │  (Next.js)   │
└────────────────┘   hello / stt / tts      └──────────────┘   device/voice/answer   └──────────────┘
                      + Opus 二进制帧
```

**测评逻辑一行都没有重复实现**：出题、计分、进度、报告全在主应用里，ws-server 只做协议翻译。

---

## 二、目录结构

```
ws-server/
├── server.mjs                  入口：HTTP 健康检查 + WebSocket 升级 + 鉴权
├── package.json
├── src/
│   ├── config.mjs              环境变量配置
│   ├── logger.mjs              带级别和时间戳的日志
│   ├── protocol.mjs            虾哥协议：二进制帧编解码 + JSON 消息构造
│   ├── ogg-opus.mjs            Ogg 容器 ⇄ 裸 Opus 包（上行必需，见第五节）
│   ├── audio.mjs               mp3 → 24kHz/60ms Opus（下行）
│   ├── lzti-client.mjs         主应用 HTTP 客户端（ping / voice/answer / voice/next）
│   └── session.mjs             单连接状态机：录音累积、句子边界、下发播报
├── test/
│   ├── protocol.test.mjs       二进制帧编解码测试
│   ├── ogg-opus.test.mjs       Ogg 封装测试（含 ffmpeg 解码集成测试）
│   ├── session.test.mjs        会话状态机测试
│   └── simulate-firmware.mjs   虾哥固件模拟器（端到端验证）
└── README.md
```

---

## 三、协议对齐（源码依据）

固件仓库：`~/projects/xiaozhi-esp32`

| 环节 | 实现 | 固件源码位置 |
|------|------|-------------|
| 握手头 | `Authorization: Bearer <token>` / `Protocol-Version` / `Device-Id` / `Client-Id` | `main/protocols/websocket_protocol.cc:97-106` |
| 服务端 hello | 必须含 `transport:"websocket"`、`audio_params.sample_rate`、`audio_params.frame_duration` | `main/protocols/websocket_protocol.cc:236-266` |
| 客户端 hello | 固件主动发，我们只记录 | `main/protocols/websocket_protocol.cc:210-234` |
| 说话开始/结束 | `{"type":"listen","state":"start"/"stop"}` | `main/protocols/protocol.cc:82-100` |
| 上行音频 | 二进制帧：v1 裸包 / v2 16 字节头 / v3 4 字节头 | `main/protocols/protocol.h:23-37`、`websocket_protocol.cc:108-140` |
| 下行音频 | 二进制帧 type=0，Opus 24kHz/60ms | `main/protocols/websocket_protocol.cc:24-54` |
| 识别文字 | `{"type":"stt","text":"..."}` → 固件显示到屏幕 | `main/application.cc` 的 stt 分支 |
| 播报 | `{"type":"tts","state":"start"/"stop"}` + `{"type":"tts","state":"sentence_start","text":"..."}` | `main/application.cc` 的 tts 分支 |

### 三个必须遵守的硬约束

1. **`transport` 必须是 `"websocket"`**
   固件 `ParseServerHello` 校验不过就 `return`，`WEBSOCKET_PROTOCOL_SERVER_HELLO_EVENT` 永不置位，
   10 秒后 `OpenAudioChannel` 返回失败。少了这个字段 = 连接必挂。

2. **下行必须先发 `tts start`，最后发 `tts stop`**
   固件只在 `kDeviceStateSpeaking` 状态下才把收到的音频推进解码队列
   （`main/application.cc:579` 的 `OnIncomingAudio`），否则帧会被直接丢掉。

3. **下行要按 60ms 一帧匀速发，不能一次性喷完**
   固件播放队列只有 2 个槽（`MAX_PLAYBACK_TASKS_IN_QUEUE`），解码队列 20 个槽
   （`MAX_DECODE_PACKETS_IN_QUEUE = 1200/60`），超了直接丢帧。我们按帧长实时下发。

---

## 四、运行

```bash
cd ws-server
npm install                # 只有一个依赖：ws
WS_PORT=3020 \
LZTI_BASE_URL=http://localhost:3010 \
node server.mjs
```

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `WS_PORT` | 3020 | 监听端口 |
| `WS_HOST` | 0.0.0.0 | 监听地址 |
| `LZTI_BASE_URL` | http://localhost:3010 | 主应用地址 |
| `FFMPEG_PATH` | /usr/bin/ffmpeg | mp3 → opus 转码用 |
| `WS_SILENCE_TIMEOUT_MS` | 1200 | 静默兜底：多久没新音频帧就算一句话说完 |
| `WS_SPEAK_LEAD_IN_MS` | 200 | `tts start` 到第一帧音频之间的等待（等固件切 Speaking 状态） |
| `WS_FRAME_INTERVAL_MS` | 60 | 下行帧间隔 |
| `WS_KEEPALIVE_INTERVAL_MS` | 60000 | 应用层保活（固件 120 秒无数据就判超时） |
| `WS_MAX_UTTERANCE_BYTES` | 5MB | 单句音频上限 |
| `LOG_LEVEL` | info | debug / info / warn / error |

健康检查：`GET /health`

### 设备侧怎么连

设备连的 URL 必须带 `sessionId` 和 `questionnaireType`（query 参数），因为固件的握手 URL 是配置项，
不改代码就没法在协议里带业务参数：

```
ws://<host>:3020/?sessionId=<测评会话ID>&questionnaireType=parent
```

`questionnaireType` 取 `parent` / `student` / `teacher`。

### 固件侧要配的两个 settings

| 配置项 | 值 |
|--------|-----|
| `websocket.url` | `ws://<host>:3020/?sessionId=...&questionnaireType=parent` |
| `websocket.token` | 设备令牌（不含 `Bearer `，固件会自动补前缀） |
| `websocket.version` | 2 或 3（不填则固件用 1，即裸 Opus 包，本服务也支持） |

---

## 五、音频格式（实测结论）

### 下行：mp3 → Opus（A 方案，服务端转码）

我们的 TTS 只有 MiniMax，输出 mp3；虾哥固件的下行解码器是 `esp_opus_dec`，只吃 Opus。
所以服务端转码：**ffmpeg libopus → 24kHz 单声道 60ms → 裸 Opus 包**。

- 24kHz / 60ms 是虾哥官方服务端的参数，固件 `server_sample_rate_` 默认就是 24000
  （`main/protocols/protocol.h:56`），且固件会用我们 hello 里的 `audio_params` 重建解码器
  （`main/audio/audio_service.cc:532 SetDecodeSampleRate`），两边一致才对得上。
- 帧长必须是 60ms（`OPUS_FRAME_DURATION_MS`，`main/audio/audio_service.h:40`），固件按
  `sample_rate/1000*60` 计算每帧样本数，60ms → 1440 个 int16。

### 上行：裸 Opus 包 → Ogg Opus（C 方案的一部分，必须做）

**实测：MiniMax ASR 不接受裸 Opus 包流。**
把 24 个裸 Opus 包直接拼起来上传，返回 `400 / 2013 Invalid data found when processing input`；
用 Ogg Opus 封装则正常识别。

所以 ws-server 会把设备发来的裸 Opus 包重新封成 Ogg Opus（`src/ogg-opus.mjs`）再 POST 给主应用。

> ⚠️ **这条对「路径 A」（固件改造）同样成立**：固件如果直接 POST 裸 Opus 包给
> `/api/device/voice/answer`，会得到 500。要么固件自己封 Ogg，要么在主应用侧加一层封装。

> ⚠️ **Ogg 封装有个坑**：`OpusHead` 必须单独占 BOS 页，和 `OpusTags` 同页会导致
> ffmpeg 报 `Header processing failed`、MiniMax 直接拒收。`test/ogg-opus.test.mjs` 里有回归测试。

### 没选 B（固件加 mp3 解码）

固件侧加 mp3 解码要动 codec 工厂和内存占用，而服务端转码只多一个 ffmpeg 依赖，
且虾哥官方链路本来就是 Opus 下行。路径 B 的目标是「固件零改动」，服务端适配更对味。

---

## 六、测试

```bash
cd ws-server
npm test          # node --test，19 个用例
```

端到端（需要主应用在 3010 上跑着）：

```bash
# 1. 造一个设备令牌（dev 库）
# 2. 起服务
WS_PORT=3020 LZTI_BASE_URL=http://localhost:3010 node server.mjs
# 3. 模拟虾哥固件跑一遍
node test/simulate-firmware.mjs \
  --url "ws://localhost:3020/?sessionId=<ID>&questionnaireType=parent" \
  --token <deviceToken> \
  --protocol 3 \
  --speech /path/to/speech.mp3
```

模拟器会按固件的行为走：握手带 4 个头 → 发客户端 hello → 等服务端 hello →
收 TTS 音频 → 发 listen start → 连续发 Opus 帧 → 发 listen stop → 收 stt 和下一题。

---

## 七、已知限制

- **sessionId / questionnaireType 靠 URL query 传**：固件握手 URL 是配置项，
  协议本身没有地方放业务参数。真机上要在设备配置里写死一个 sessionId，
  换测评会话要重新配（或者由固件侧改造支持动态指定）。
- **应用层保活发的是固件不认识的 JSON**（`{"type":"ping"}`）：
  固件会打一行 `Unknown message type` 的 warning，逻辑上无副作用。
  WebSocket 层的 ping 不算数，固件只在收到数据帧时才刷新超时计时。
- **下行音频实时下发**：一问一答的节奏受 TTS 时长限制（当前播报文案约 10 秒）。
  播报太快孩子来不及反应，太慢又显得拖沓，播报文案的措辞在
  `src/lib/voice-prompt.ts`，不在本服务范围内。
- **没有做多设备并发控制**：同一个 session 被两个设备同时连接会互相覆盖进度
  （主应用的进度写入是 last-write-wins）。
- **主应用已出报告的 session 走语音答题会 500**（`saveProgress` 撞
  `@@unique([sessionId, questionnaireType])`）。这是主应用既有行为，不是本服务引入的，
  但真机测试时要用没提交过的 session。
