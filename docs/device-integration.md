# 荔枝测评 · 设备接入（ESP32 答题手柄）

> 版本：第 0 步（服务端接口已就绪，固件未开始）
> 更新：2026-10-28

---

## 一、为什么是「手柄」而不是「小屏答题机」

荔枝测评一份问卷 57~93 道题，题干是完整句子（例如「遇到有点难的学习任务时，孩子能坚持尝试，不轻易放弃。」），
5 点量表（1=非常不符合 … 5=非常符合）。

- **屏幕读不了**：ESP32 常见的小屏是 0.96 寸 / 1.3 寸 OLED，横向最多显示十几个字，
  一道题干要滚屏 3~5 屏，家长读一句、孩子看一眼、再低头按一次，实际体验极差。
- **真实场景是「家长读题、孩子按键」**：孩子 1~2 年级根本读不懂「轴」「维度」「象限」这些词，
  家长读题、孩子按 1~5，才是这个年龄段真实发生的互动。
- **手柄的形态优势**：便宜、小、轻、单手可握、5 个按键 + 一个喇叭就够；
  题目显示在家长自己的手机/平板上，屏幕问题直接消失。
- **语音是补位而不是主位**：题目显示在手机上（家长读），手柄负责「按了没按、答到第几题」，
  并可以用服务端 TTS 播报题干，方便孩子/老人/眼睛累的时候用耳朵代替屏幕。

**结论**：硬件只做「5 点量表输入 + 状态反馈」，不做显示、不做存储题目。
服务端负责：出题、计分、出报告、播报。

---

## 二、架构

```
┌────────────────────────┐
│  ESP32 答题手柄         │
│  · 5 个按键 (1~5)       │
│  · 喇叭 (播提示音/题干)  │
│  · 本地存 deviceToken   │
└───────────┬────────────┘
            │  HTTPS / JSON
            │  Authorization: Bearer <deviceToken>
            ▼
┌──────────────────────────────────────────────────────────┐
│  lzti  (Next.js / App Router)                             │
│                                                          │
│  /api/device/questions   取题目（按维度分页）              │
│  /api/device/answer      增量保存一道题                    │
│  /api/device/submit      提交测评                          │
│  /api/device/session     读进度（断点续答）                 │
│  /api/device/speak       任意文本转 mp3                    │
│  /api/device/ping        心跳                              │
│  /api/device/pair        配对（换 deviceToken）            │
│  /api/device/pairing-code 生成配对码（用户 JWT）           │
│  /api/devices            设备列表 / 删除吊销（用户 JWT）    │
│           │                                              │
│           ├──▶ Prisma (lzti_dev / lzti)                   │
│           │    Device / DeviceToken / DevicePairingCode    │
│           │    AssessmentSession / SessionAttempt          │
│           │                                              │
│           └──▶ MiniMax TTS (t2a_v2)                       │
│                服务端代播题干，设备只管播放                  │
└──────────────────────────────────────────────────────────┘
```

**两条鉴权线，互不混用**：

| 鉴权方式 | 载体 | 用在哪 |
|---------|------|--------|
| 用户 JWT | `Authorization: Bearer <jwt>` | 生成配对码、设备列表、删除设备 |
| 设备令牌 | `Authorization: Bearer <deviceToken>` | 取题目、答题、提交、播报、心跳 |

设备令牌不是用户 JWT 的替代品：它只能访问「答题」这一类接口，不能列设备、不能删设备。

---

## 三、端点清单

所有响应统一用 lzti 的格式：`{ success: true, data }` 或 `{ success: false, error }`。

### 3.1 用户侧（用户 JWT）

| 方法 | 路径 | 请求 | 响应 data |
|------|------|------|-----------|
| POST | `/api/device/pairing-code` | 无 body | `{ code: "123456", expiresAt: "ISO时间" }` |
| GET | `/api/devices` | 无 | `[{ id, name, deviceKey, status, lastSeenAt, createdAt, tokenCount }]` |
| DELETE | `/api/devices/{id}` | 无 | `{ revoked: true, deviceId }` |

### 3.2 设备侧（设备令牌）

| 方法 | 路径 | 请求 | 响应 data |
|------|------|------|-----------|
| POST | `/api/device/pair` | `{ code, deviceKey, name? }` | `{ deviceId, deviceToken }`（**deviceToken 只在这里返回一次**） |
| GET | `/api/device/ping` | 无 | `{ ok, deviceId, deviceName, userId, serverTime }` |
| GET | `/api/device/questions` | query: `stageId`, `type`, `dimensionIndex`, `includeAudio?` | 见 3.3 |
| GET | `/api/device/session` | query: `sessionId`, `type` | `{ sessionId, stageId, childId, childName, questionnaireType, hasProgress, attemptId, answers, currentDimensionIndex }` |
| POST | `/api/device/answer` | `{ sessionId, questionnaireType, questionId, value, currentDimensionIndex? }` | `{ saved, attemptId, currentDimensionIndex, answeredCount }` |
| POST | `/api/device/submit` | `{ sessionId, questionnaireType }` | `{ attemptId, sessionId, questionnaireType, scores, quadrants, createdAt }` |
| POST | `/api/device/speak` | `{ text }` | `{ audioBase64 }`（mp3 的 base64） |

`POST /api/device/pair` **不需要任何鉴权** —— 配对码本身就是凭证。

### 3.3 题目响应结构

```jsonc
{
  "stageId": "primary-low",
  "stageName": "小学低年级",
  "questionnaireType": "parent",
  "dimensionIndex": 0,          // 当前维度
  "totalDimensions": 3,
  "totalQuestions": 18,         // 该视角的题目总数
  "dimensions": [
    {
      "index": 0,
      "id": "learning-interest",
      "name": "学习兴趣",
      "description": "对新知识的好奇心和投入度",
      "axis": "好奇探索 / 坚持完成",
      "questions": [
        {
          "id": "p-li-1",
          "indexInDimension": 0,   // 维度内序号
          "globalIndex": 0,        // 全卷序号
          "text": "孩子回家后会主动说起学校里学到的或发生的新鲜事。"
        }
      ]
    }
  ],
  "scale": { "min": 1, "max": 5, "minLabel": "非常不符合", "maxLabel": "非常符合" },
  "audio": [                     // 只有 includeAudio=1 时才有；失败时为空数组
    { "questionId": "p-li-1", "audioBase64": "SUQzB..." }
  ]
}
```

**按维度分页**：`dimensionIndex` 一次只返回一个维度（`dimensions` 数组里只有 1 项），
ESP32 内存和流量都小。

**错误码**：

| 情况 | 状态码 | error |
|------|-------|-------|
| 设备令牌无效/被吊销 | 401 | `设备未授权` |
| 配对码格式错 | 400 | `配对码格式错误` |
| 配对码无效/已用/过期 | 400 | `配对码无效` / `配对码已被使用` / `配对码已过期` |
| deviceKey 已绑定别的账号 | 409 | `该设备已绑定其他账号，请先在原账号中解绑` |
| `dimensionIndex` 越界 | 400 | `题目索引越界` |
| 答案不是 1~5 整数 | 400 | `答案值必须在1-5之间` |
| session 不属于该设备背后的用户 | 403 | `无权访问该测评会话` |
| 还有题没答就提交 | 400 | `还有 N 道题未作答` |

---

## 四、配对流程（时序）

```
家长手机/网页                 ESP32 手柄                lzti 服务端
     │                             │                         │
     │ ① 登录态请求配对码           │                         │
     │  POST /api/device/pairing-code  (Bearer 用户JWT)      │
     │─────────────────────────────│─────────────────────────▶│
     │                             │                         │ 生成 6 位码
     │      { code: "547191" }     │                         │ 10 分钟过期
     │◀────────────────────────────│◀────────────────────────│
     │                             │                         │
     │ ② 家长把码念给/输进设备      │                         │
     │────────────────────────────▶│                         │
     │                             │ ③ 用码换令牌             │
     │                             │ POST /api/device/pair   │
     │                             │─────────────────────────▶│
     │                             │   { code, deviceKey }    │
     │                             │   { deviceId, deviceToken }
     │                             │◀────────────────────────│
     │                             │                         │
     │                             │ ④ 令牌存进本地 Flash     │
     │                             │ （只存这一份，不再走配对）│
```

- 配对码 **6 位数字、10 分钟过期、一次性使用**。
- 用户再生成一个新码，之前那个立即作废（同一时刻只有一个有效码）。
- 同一台设备（`deviceKey`）重复配对到同一账号：复用设备记录，重新签发令牌。
- 同一台设备配到别的账号：**409 拒绝**，必须先在原账号里删除该设备，不偷偷改绑。
- 设备令牌有效期 365 天，服务端只存 `sha256(token)`，明文只在签发时返回一次。

---

## 五、设备侧要点（固件实现时注意）

### 5.1 令牌存储
- `deviceToken` 存 ESP32 的 NVS（加密分区最好），掉电不丢。
- 存**用户 JWT 吗？不存**。设备只需要 deviceToken，家长账号的密码/令牌不要进硬件。
- 设备拿到 401 时：提示「请在手机上重新配对」，引导用户走一次配对流程（拿到新 deviceToken）。

### 5.2 按键
- 5 个按键映射 GPIO，做**硬件上拉 + 软件去抖**（建议 30~50 ms）。
- 长按 1.5 秒 = 「重复上一题 / 返回上一题」，短按 = 选择。
- 每次按键：短促「滴」一声（表示已识别）+ 答完一题后「嘀-嘀」两声（表示已保存）。
- 按键后**立刻**发 `POST /api/device/answer`（增量合并，服务端不用重传全量答案）。
- 网络未通时：本地缓存这一题（队列），有网后按顺序补发；补发前先 `GET /api/device/session` 拿服务端已有进度做**去重合并**（以服务端为准，本地同题号覆盖）。

### 5.3 断点续答
- `GET /api/device/session?sessionId=&type=` 返回 `hasProgress`、`answers`、`currentDimensionIndex`。
- 设备上电/重连时先调这个接口：
  - `hasProgress=true` → 从 `currentDimensionIndex` 继续，已答过的题不再问；
  - `hasProgress=false` → 从第 0 维度第 0 题开始。
- 服务端的进度和网页端进度是**同一份数据**（同一个 `SessionAttempt.progress`），
  所以家长在手机上看到一半、孩子在手柄上答一半，是能接上的。

### 5.4 音量
- 音量用两个实体按键（音量+/-）或长按某个数字键调节，存在 NVS。
- 静音时只闪灯不响。
- 题干朗读建议**分段播**（先维度名，再题干），家长可以说「停」跳过。

### 5.5 供电与待机
- 手柄用锂电池 + USB-C 充电，续航目标 > 8 小时连续答题。
- 空闲 5 分钟进入深度睡眠（省电），按键唤醒。
- **不要**在答题过程中因为超时就断电保存 —— 每次按键都已增量落库。

---

## 六、安全边界（当前已实现）

| 项 | 做法 |
|----|------|
| 设备令牌存储 | 服务端只存 `sha256(rawToken)` 的 hex，明文只在 `POST /api/device/pair` 返回一次 |
| 配对码 | 6 位数字、10 分钟过期、一次性；重新生成会作废旧码 |
| 远程吊销 | `DELETE /api/devices/{id}` → 设备置 `revoked`，其全部令牌同时置 `revokedAt`，设备立刻 401 |
| 越权隔离 | 所有 `sessionId` 相关操作校验 `session.child.userId === 设备背后的 userId`，否则 403 |
| 答案校验 | `value` 必须是 1~5 的整数；提交前校验「该视角题目是否答完」 |
| 密钥隔离 | MiniMax API Key 只在服务端，硬件不接触任何第三方密钥 |
| 管理面隔离 | 列设备/删设备必须用户 JWT，设备令牌无权调用 |

---

## 七、明确未实现的部分（生产前必须补）

> 这一节是**已知的欠账**，不是遗漏。

| 项 | 现状 | 生产要补什么 |
|----|------|-------------|
| **限流** | `/api/device/*` 目前**没有限流**。ESP32 批量上报时如果每题都打一次接口，网络抖动可能打爆实例 | 至少给 `POST /api/device/answer` 加「每设备每分钟 N 次」限流（lzti 已有 `src/lib/api/ratelimit.ts` 的内存限流器，生产是单实例也够用，但多实例要换 Upstash Redis） |
| **设备管理后台** | 只有 `GET /api/devices` / `DELETE /api/devices/{id}` 两个接口，**没有前端页面** | 加一个「我的设备」页面：列表、吊销、改名、看 lastSeenAt |
| **音频存储与清理** | TTS 生成的 mp3 **不落库、不落盘**，实时生成实时返回 | 现状每次请求都重新合成（一次 6 题约 2 秒）。生产要么加缓存（Redis，key = 题干 hash），要么接受这个延迟 |
| **批量设备管理** | 一次只能管一台 | 家庭可能有 2~3 台（客厅一台、卧室一台），需要「一次吊销全部」或按组管理 |
| **OTA / 固件升级** | 完全没有 | 需要设备上报固件版本、服务端下发新版本 URL、设备端下载校验 |
| **设备端证书** | 没有 | ESP32 走 HTTPS 要烧根证书（`esp-mqtt`/`esp-idf` 的 cert bundle），固件里要处理证书轮换 |
| **音频缓存与并发保护** | `includeAudio=1` 会一次并发合成 5 条 | 生产要防 MiniMax 侧限流，加并发上限 + 失败重试 |
| **审计日志** | 配对/吊销没有单独的审计表 | 生产要能查「谁在什么时候把哪台设备绑到了哪个账号」 |
| **配对码防爆破** | 配对码只有 6 位，10 分钟过期 | 需要对 `POST /api/device/pair` 加失败次数限制（同一 code 连续错 5 次即作废） |

---

## 八、下一步：ESP32 固件要点

### 8.1 配网（BLE / SoftAP 二选一）
- **SoftAP**：ESP32 起一个 `LZTI-SETUP` 热点，手机连上去填 WiFi 密码；串口/网页回传 SSID。
  适合「第一次配置」，实现简单。
- **BLE**：手机 App 用 BLE 配网（ESP-IDF 的 `wifi_provisioning` manager），
  体验更好但开发量大。
- 建议：**先 SoftAP 跑通，再上 BLE**。

### 8.2 走 HTTPS
- ESP32 烧根证书：用 `esp-idf` 的 `esp_http_client` + `esp-tls` 的 bundle 证书。
- 证书会过期（Let's Encrypt 90 天），**固件必须支持证书轮换**：
  方案 A：固件里烧一张长期有效的根 CA（自己签的 CA 做中间签发）；
  方案 B：固件支持 OTA 拉取新证书；
  方案 C：退一步用自建域名 + 内网代理。
- 建议一开始就用**自签 CA 链**（自有根 CA → 签 lzti 域名的证书），轮换周期自己定。

### 8.3 按键 GPIO 规划（ESP32-C3 / ESP32-S3 示例）

| 按键 | 建议 GPIO | 备注 |
|------|----------|------|
| 1 | GPIO4 | 上拉输入，按下为低 |
| 2 | GPIO5 | |
| 3 | GPIO6 | |
| 4 | GPIO7 | |
| 5 | GPIO8 | |
| 音量+ | GPIO9 | 长按数字键也行，但独立键更好按 |
| 音量- | GPIO10 | |
| 确认/下一题 | GPIO11 | 或复用长按 |
| 电池检测 | ADC1 通道 | ESP32-C3 用 ADC1 GPIO0~4，注意与 WiFi 冲突 |
| 状态灯 | GPIO2（板载 LED） | 呼吸灯表示在线，绿=空闲，蓝=答题中，红=错误 |
| I2S 喇叭 | GPIO21/22（SDA/SCL） | MAX98357A 功放 + 4Ω 3W 喇叭；mp3 解码走 I2S 输出 |

注意：
- ESP32-C3 的 **ADC2 不能与 WiFi 共存**，电池采样要用 ADC1。
- 引脚紧张时可以省掉「音量+/-」，用长按 1/5 调音量。
- 建议再加一个 **BOOT 键**（GPIO9）做恢复出厂：清除 NVS 里的 deviceToken，重新配对。

### 8.4 固件状态机

```
        ┌──────────┐
        │  未配对   │  ← 上电检测不到 deviceToken
        └────┬─────┘
             │ 播「请在手机上获取配对码」
             ▼
        ┌──────────┐   POST /api/device/pair
        │  配对中   │ ──────────────────▶ 拿到 deviceToken → 存 NVS
        └──────────┘
             ▼
        ┌──────────┐   GET /api/device/session
        │  同步进度 │ ──────────────────▶ 拿到 currentDimensionIndex
        └────┬─────┘
             ▼
   ┌──────────────────┐
   │  答题中（主循环）  │  GET /api/device/questions?dimensionIndex=i
   │  · 取当前维度题目  │  按键 → POST /api/device/answer
   │  · 播报题干(TTS)   │  该维度答完 → dimensionIndex++ / 全部答完 → submit
   └────────┬─────────┘
            │ 401
            ▼
        ┌──────────┐
        │  令牌失效 │ → 播「请重新配对」→ 回未配对态
        └──────────┘
```

---

## 九、本地跑一遍（模拟器）

服务端接口写完了，先用 Python 模拟器把整条链路跑通，不用等固件。

```bash
# 1. 拿一个用户 JWT（登录 /api/auth/login，或本地签一个开发 token）

# 2. 跑模拟器：自动配对 → 取题 → 逐题按键 → 提交
python3 scripts/device-simulator.py \
  --base-url http://localhost:3010 \
  --user-token <用户JWT> \
  --stage primary-low \
  --type parent

# 只看题目不答题
python3 scripts/device-simulator.py \
  --base-url http://localhost:3010 \
  --user-token <用户JWT> \
  --stage primary-low \
  --questions-only

# 顺便听一下服务端代播的题干
python3 scripts/device-simulator.py ... --include-audio
```

模拟器会自己建孩子和测评会话（用 `--session-id` 可以指定已有会话），
每个 HTTP 调用都会打印 `→ 方法 路径` / `← 状态码`。

---

## 十、相关文件

| 文件 | 作用 |
|------|------|
| `prisma/schema.prisma` | `Device` / `DeviceToken` / `DevicePairingCode` 三个 model |
| `src/lib/device-auth.ts` | 配对码、设备令牌、鉴权包装 `withDeviceAuth` |
| `src/lib/device-questions.ts` | 题目切片（按维度分页） |
| `src/lib/device-session.ts` | 设备侧的会话读写与进度存储 |
| `src/lib/minimax-tts.ts` | MiniMax TTS 封装（服务端代播） |
| `src/app/api/device/**` | 设备侧接口 |
| `src/app/api/devices/**` | 用户侧设备管理接口 |
| `scripts/device-simulator.py` | Python 手柄模拟器 |
