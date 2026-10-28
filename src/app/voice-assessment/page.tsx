'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { voice, assessment, children, type VoiceQuestion } from '@/lib/api/client';

/**
 * 语音测评页 —— 设备念题、孩子说话作答。
 *
 * 这个页面是「遥控器」，不是答题界面：
 * 真正的题目显示在设备那块 4.2 寸屏上，家长和孩子看设备；
 * 这个页面负责：建立会话、把设备的音频放出来、显示识别到了什么、进度如何。
 *
 * 为什么不让家长在这里答题：
 * 语音测评的价值就是「不用看屏幕、不用按键」——如果还要盯着手机点，
 * 那就退回到普通网页测评了，设备反而是多余的。
 *
 * 浏览器没有麦克风时的降级路径：底部有「网页答题」入口，
 * 家长可以直接在手机上点 1-5，用同一套计分与出报告逻辑。
 */

type Phase = 'setup' | 'running' | 'finished' | 'error';

interface Child {
  id: string;
  name: string;
  grade?: string;
}

function VoiceAssessmentContent() {
  const router = useRouter();

  // sessionId 从 URL query 取。这里不用 useSearchParams —— 它会让静态路由在
  // 构建期 bail out（SSR 变成空壳，只剩 layout）。改为自己在挂载后读，
  // 代价是首帧拿不到 query，代价远小于整页 SSR 失效。
  const [sessionIdParam, setSessionIdParam] = useState<string | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setSessionIdParam(sp.get('sessionId'));
  }, []);

  const [phase, setPhase] = useState<Phase>('setup');
  const [childList, setChildList] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [questionnaireType, setQuestionnaireType] = useState<'parent' | 'student'>('parent');
  const [stageId, setStageId] = useState('primary-low');
  const [sessionId, setSessionId] = useState<string | null>(sessionIdParam);

  const [question, setQuestion] = useState<VoiceQuestion | null>(null);
  const [recognized, setRecognized] = useState<string>('');
  const [lastAnswer, setLastAnswer] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ── 初始化：拉孩子列表 ────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await children.list();
        const list = res.children as Child[];
        setChildList(list);
        if (list.length > 0) setSelectedChild(list[0].id);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : '加载孩子列表失败');
        setPhase('error');
      }
    })();
  }, []);

  // ── 播放设备返回的题目音频 ────────────────────────
  const playAudio = useCallback((base64: string | null) => {
    if (!base64) return;
    try {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {
        // 自动播放被浏览器拦截：用户点一下页面就能继续
      });
    } catch {
      // 音频播放失败不影响主流程
    }
  }, []);

  // ── 建立会话并取第一题 ────────────────────────────
  const start = async () => {
    if (!selectedChild) {
      setErrorMsg('请先选择孩子');
      return;
    }
    try {
      setErrorMsg('');
      let sid = sessionId;
      if (!sid) {
        const session = await assessment.createSession({
          childId: selectedChild,
          stageId,
        });
        sid = session.id;
        setSessionId(sid);
      }
      const q = await voice.next(sid, questionnaireType);
      setQuestion(q);
      setPhase('running');
      playAudio(q.audioBase64);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '启动失败');
      setPhase('error');
    }
  };

  // ── 设备上传录音后，服务端返回识别结果与下一题 ──
  // 这里通过轮询设备侧状态获取（设备主动上报后由服务端记录）
  // 简化：设备答完后会自动进入下一题，网页端通过 voice.next 拉取最新进度。
  const pollProgress = useCallback(async () => {
    if (!sessionId) return;
    try {
      const q = await voice.next(sessionId, questionnaireType);
      setQuestion(q);
      setRetrying(false);
      if (q.finished) {
        setPhase('finished');
      }
    } catch {
      // 轮询失败忽略
    }
  }, [sessionId, questionnaireType]);

  useEffect(() => {
    if (phase !== 'running') return;
    const timer = setInterval(pollProgress, 4000);
    return () => clearInterval(timer);
  }, [phase, pollProgress]);

  // ── 浏览器麦克风路径（设备不在身边时的降级） ──────
  const recordAndSubmit = async () => {
    if (!sessionId || !question) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const buf = await blob.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);

        const res = await voice.answer(sessionId, questionnaireType, base64);
        setRecognized(res.recognizedText);
        setLastAnswer(res.normalizedValue);
        setRetrying(res.retry);
        setQuestion(res.next);
        if (res.finished) setPhase('finished');
        playAudio(res.next.audioBase64);
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '录音失败');
    }
  };

  // ── 渲染 ──────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
        <header className="px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-800">语音测评</h1>
            <p className="text-sm text-stone-500">设备念题，孩子说话作答</p>
          </div>
          <Link
            href="/devices"
            className="px-4 py-2 rounded-full bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 transition text-sm"
          >
            设备管理
          </Link>
        </header>

        <main className="px-6 pb-12 max-w-lg mx-auto space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="rounded-2xl bg-white shadow-sm border border-stone-200 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">谁来回答</label>
              {childList.length === 0 ? (
                <p className="text-sm text-stone-400">还没有孩子档案</p>
              ) : (
                <div className="space-y-2">
                  {childList.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedChild(c.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                        selectedChild === c.id
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <span className="font-medium text-stone-800">{c.name}</span>
                      {c.grade && (
                        <span className="text-sm text-stone-500 ml-2">{c.grade}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">谁在回答</label>
              <div className="flex gap-2">
                {(
                  [
                    { v: 'parent', label: '家长观察' },
                    { v: 'student', label: '孩子自评' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setQuestionnaireType(opt.v)}
                    className={`flex-1 px-4 py-2.5 rounded-xl border text-sm transition ${
                      questionnaireType === opt.v
                        ? 'border-amber-400 bg-amber-50 text-amber-800 font-medium'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={start}
              disabled={childList.length === 0}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              开始
            </button>
          </section>

          <section className="rounded-2xl bg-white/60 border border-stone-200 p-5">
            <p className="text-sm text-stone-600 leading-relaxed">
              开始后，<span className="font-medium text-stone-800">请看设备屏幕</span>
              ——题目会显示在设备上并念出来，孩子直接说「选三」就行。
              <br />
              这个页面只显示进度和识别结果，不用一直盯着。
            </p>
            <Link
              href="/select-child"
              className="mt-3 inline-block text-sm text-amber-700 underline"
            >
              改用网页答题
            </Link>
          </section>
        </main>
      </div>
    );
  }

  // 测评中 / 已完成
  const progress = question && question.totalQuestions > 0
    ? Math.round((question.answeredCount / question.totalQuestions) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <header className="px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">语音测评</h1>
          <p className="text-sm text-stone-500">
            {phase === 'finished' ? '已完成' : '请看设备屏幕'}
          </p>
        </div>
        <Link
          href="/devices"
          className="px-4 py-2 rounded-full bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 transition text-sm"
        >
          设备管理
        </Link>
      </header>

      <main className="px-6 pb-12 max-w-lg mx-auto space-y-5">
        {errorMsg && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* 进度 */}
        <section className="rounded-2xl bg-white shadow-sm border border-stone-200 p-6">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-stone-500">
              第 {question?.questionNumber ?? 0} 题 / 共 {question?.totalQuestions ?? 0} 题
            </span>
            <span className="text-2xl font-bold text-amber-600">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {question?.dimensionName && (
            <p className="mt-4 text-xs text-stone-400">{question.dimensionName}</p>
          )}
        </section>

        {/* 设备状态 */}
        <section className="rounded-2xl bg-white shadow-sm border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                phase === 'finished' ? 'bg-green-500' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-sm font-medium text-stone-700">
              {phase === 'finished' ? '测评已完成' : '设备正在答题'}
            </span>
          </div>

          {recognized ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-stone-50">
                <p className="text-xs text-stone-400 mb-1">设备听到的</p>
                <p className="text-stone-800">「{recognized}」</p>
              </div>
              {lastAnswer !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-stone-500">识别为</span>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                    {lastAnswer} 分
                  </span>
                </div>
              )}
              {retrying && (
                <p className="text-sm text-amber-600">没听清，设备会再问一次</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-stone-400">等设备听到孩子的回答…</p>
          )}
        </section>

        {/* 降级路径：设备不在身边时，用手机麦克风 */}
        {phase === 'running' && (
          <section className="rounded-2xl bg-white/60 border border-stone-200 p-5">
            <p className="text-sm text-stone-600 mb-3">
              设备不在身边？用手机麦克风直接说答案：
            </p>
            <button
              onClick={recordAndSubmit}
              className="w-full py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 font-medium hover:bg-amber-100 transition"
            >
              🎤 按住说话（4 秒）
            </button>
          </section>
        )}

        {phase === 'finished' && (
          <section className="rounded-2xl bg-white shadow-sm border border-stone-200 p-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-stone-700 mb-4">全部题目已答完</p>
            <button
              onClick={() => router.push('/history')}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition"
            >
              查看测评报告
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default function VoiceAssessmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    }>
      <VoiceAssessmentContent />
    </Suspense>
  );
}
