import assert from 'node:assert/strict';
import test from 'node:test';

// 先调小各类等待时间，让测试跑得快
process.env.WS_SPEAK_LEAD_IN_MS = '1';
process.env.WS_FRAME_INTERVAL_MS = '1';
process.env.WS_SILENCE_TIMEOUT_MS = '80';

const { DeviceSession } = await import('../src/session.mjs');
const { extractOpusFrames } = await import('../src/ogg-opus.mjs');
const { encodeBinaryFrame, FRAME_TYPE } = await import('../src/protocol.mjs');

/** 按握手协商出的协议版本封装一个上行 Opus 二进制帧 */
function opusFrame(payload, version = 3) {
  return encodeBinaryFrame({ type: FRAME_TYPE.OPUS, payload: Buffer.from(payload) }, version);
}

class FakeWs {
  constructor() {
    this.sent = [];
    this.readyState = 1;
    this.OPEN = 1;
    this.closeCalls = [];
  }

  send(data) {
    this.sent.push(data);
  }

  close(code, reason) {
    this.closeCalls.push({ code, reason });
  }

  /** 解析出的 JSON 文本帧 */
  get jsons() {
    return this.sent
      .filter((item) => typeof item === 'string')
      .map((item) => JSON.parse(item));
  }

  /** 二进制帧（原始 Buffer） */
  get binaries() {
    return this.sent.filter((item) => Buffer.isBuffer(item));
  }
}

function makeRequest(overrides = {}) {
  const headers = {
    authorization: 'Bearer test-token',
    'protocol-version': '3',
    'device-id': 'AA:BB:CC:DD:EE:FF',
    'client-id': 'uuid-1234',
    ...overrides.headers,
  };
  const url = overrides.url || '/?sessionId=sess-1&questionnaireType=parent';
  return { headers, url, deviceIdentity: overrides.deviceIdentity };
}

/** 造一个可解回 Ogg 的假 mp3（转码函数会被替换掉，这里只需要非空） */
const FAKE_MP3_BASE64 = Buffer.from('fake-mp3-bytes').toString('base64');

function makeClient(overrides = {}) {
  return {
    ping: async () => ({ deviceId: 'dev-1', userId: 'user-1', deviceName: '测试手柄' }),
    voiceNext: async () => ({
      questionId: 'q1',
      questionText: '题目一',
      questionNumber: 1,
      totalQuestions: 3,
      answeredCount: 0,
      finished: false,
      prompt: '第1题，请选择1到5',
      audioBase64: FAKE_MP3_BASE64,
      scale: { min: 1, max: 5 },
    }),
    voiceAnswer: async () => ({
      recognizedText: '选A',
      normalizedValue: 1,
      accepted: true,
      retry: false,
      finished: false,
      next: {
        questionId: 'q2',
        questionText: '题目二',
        questionNumber: 2,
        totalQuestions: 3,
        answeredCount: 1,
        finished: false,
        prompt: '第2题，请选择1到5',
        audioBase64: FAKE_MP3_BASE64,
        scale: { min: 1, max: 5 },
      },
    }),
    ...overrides,
  };
}

function makeSession(client, request) {
  const ws = new FakeWs();
  const session = new DeviceSession({
    ws,
    request: request || makeRequest(),
    client,
    toOpusFrames: async () => [Buffer.from([1, 2, 3]), Buffer.from([4, 5, 6])],
  });
  return { ws, session };
}

test('连接后先发服务端 hello（transport 必须是 websocket）', async () => {
  const { ws, session } = makeSession(makeClient());
  await session.start();

  const hello = ws.jsons[0];
  assert.equal(hello.type, 'hello');
  assert.equal(hello.transport, 'websocket');
  assert.equal(hello.audio_params.sample_rate, 24000);
  assert.equal(hello.audio_params.frame_duration, 60);
});

test('连接后主动问第一题：tts start → 音频帧 → tts stop', async () => {
  const { ws, session } = makeSession(makeClient());
  await session.start();

  const jsons = ws.jsons;
  const ttsStart = jsons.findIndex((m) => m.type === 'tts' && m.state === 'start');
  const ttsStop = jsons.findIndex((m) => m.type === 'tts' && m.state === 'stop');
  const sentence = jsons.find((m) => m.type === 'tts' && m.state === 'sentence_start');

  assert.ok(ttsStart >= 0, '有 tts start');
  assert.ok(ttsStop > ttsStart, 'tts stop 在 tts start 之后');
  assert.equal(sentence.text, '第1题，请选择1到5');
  assert.equal(ws.binaries.length, 2, '两帧 Opus');
});

test('listen stop 触发识别，并把识别文字以 stt 发回', async () => {
  let received = null;
  const client = makeClient({
    voiceAnswer: async (token, input) => {
      received = input;
      return {
        recognizedText: '选三',
        normalizedValue: 3,
        accepted: true,
        retry: false,
        finished: false,
        next: {
          questionId: 'q2', questionText: '题目二', questionNumber: 2, totalQuestions: 3,
          answeredCount: 1, finished: false, prompt: '第2题', audioBase64: FAKE_MP3_BASE64,
          scale: { min: 1, max: 5 },
        },
      };
    },
  });

  const { ws, session } = makeSession(client);
  await session.start();
  ws.sent.length = 0;

  session.handleText(JSON.stringify({ type: 'listen', state: 'start' }));
  session.handleMessage(opusFrame([0xaa, 0xbb]), true); // 一帧 Opus
  session.handleText(JSON.stringify({ type: 'listen', state: 'stop' }));

  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.ok(received, '调用了 voice/answer');
  assert.equal(received.sessionId, 'sess-1');
  assert.equal(received.questionnaireType, 'parent');

  // 上行音频必须是 Ogg 封装的（MiniMax ASR 不认裸 Opus 包流）
  const ogg = received.audioBytes;
  assert.equal(ogg.subarray(0, 4).toString('latin1'), 'OggS', '是 Ogg 容器');
  const frames = extractOpusFrames(ogg);
  assert.equal(frames.length, 1);
  assert.deepEqual(frames[0], Buffer.from([0xaa, 0xbb]));

  const stt = ws.jsons.find((m) => m.type === 'stt');
  assert.ok(stt, '发了 stt');
  assert.equal(stt.text, '选三');
});

test('静默超时兜底：没有 listen stop 也会结算', async () => {
  let called = 0;
  const client = makeClient({
    voiceAnswer: async () => {
      called += 1;
      return {
        recognizedText: '嗯', normalizedValue: null, accepted: false, retry: true, finished: false,
        next: {
          questionId: 'q1', questionText: '题目一', questionNumber: 1, totalQuestions: 3,
          answeredCount: 0, finished: false, prompt: '没听清', audioBase64: FAKE_MP3_BASE64,
          scale: { min: 1, max: 5 },
        },
      };
    },
  });

  const { session } = makeSession(client);
  await session.start();
  session.handleText(JSON.stringify({ type: 'listen', state: 'start' }));
  session.handleMessage(opusFrame([0x01]), true);

  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(called, 1, '静默超时后自动结算');
});

test('缺少 sessionId 直接关闭连接', async () => {
  const { ws, session } = makeSession(makeClient(), makeRequest({ url: '/?questionnaireType=parent' }));
  await session.start();

  assert.equal(ws.closeCalls.length, 1);
  assert.equal(ws.closeCalls[0].code, 4400);
});

test('缺少 Authorization 直接关闭连接', async () => {
  const { ws, session } = makeSession(makeClient(), makeRequest({ headers: { authorization: '' } }));
  await session.start();

  assert.equal(ws.closeCalls.length, 1);
  assert.equal(ws.closeCalls[0].code, 4401);
});

test('设备令牌无效时关闭连接', async () => {
  const client = makeClient({
    ping: async () => { throw new Error('设备未授权'); },
  });
  const request = makeRequest();
  delete request.deviceIdentity;

  const { ws, session } = makeSession(client, request);
  await session.start();

  assert.equal(ws.closeCalls.length, 1);
  assert.equal(ws.closeCalls[0].code, 4401);
});

test('abort 会丢弃当前这一句话', async () => {
  let called = 0;
  const client = makeClient({
    voiceAnswer: async () => {
      called += 1;
      return { recognizedText: '', normalizedValue: null, accepted: false, retry: false, finished: false };
    },
  });

  const { session } = makeSession(client);
  await session.start();
  session.handleText(JSON.stringify({ type: 'listen', state: 'start' }));
  session.handleMessage(opusFrame([0x01]), true);
  session.handleText(JSON.stringify({ type: 'abort' }));

  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(called, 0, 'abort 后不再结算');
});
