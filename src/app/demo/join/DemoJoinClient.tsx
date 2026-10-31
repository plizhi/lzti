'use client';

/**
 * 演示链路 L3：扫码落地页（免登录作答）
 *
 * 流程：
 *   选角色 → 填姓名（可选）→ 二次确认 → 逐维答题 → 提交 → 出报告码
 *
 * 防串卷设计（老师误选成学生卷）：
 *   1. 角色卡写清「谁填」+ 展示示例题（学生卷是「你…」，教师卷是「该生…」）
 *   2. 选完角色先进确认页，再点一次「开始作答」才进答题
 *   3. 答题页顶部一直挂着角色横幅（谁在填哪份卷）
 *   4. 领取角色不占名额 → 提交前发现选错还能返回重选
 *   5. 服务端只认角色凭证里的角色，客户端改参数串不了卷
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Role = 'parent' | 'student' | 'teacher';

interface RoleView {
  role: Role;
  label: string;
  who: string;
  desc: string;
  sample: string;
  totalQuestions: number;
  status: 'pending' | 'completed';
}

interface ReportLink {
  role: string;
  label: string;
  url: string;
  code: string;
  expiresAt: string;
}

interface JoinInfo {
  code: string;
  stageId: string;
  stageName: string;
  childName: string;
  expiresAt: string;
  completed: Record<string, boolean>;
  roles: RoleView[];
  allCompleted: boolean;
  reports: ReportLink[];
}

interface Dimension {
  index: number;
  id: string;
  name: string;
  description: string;
  axis: string;
  questions: { id: string; indexInDimension: number; globalIndex: number; text: string }[];
}

interface Claim {
  role: Role;
  label: string;
  who: string;
  desc: string;
  sample: string;
  name: string;
  token: string;
  stageId: string;
  stageName: string;
  childName: string;
  totalQuestions: number;
  dimensions: Dimension[];
  scale: { min: number; max: number; minLabel: string; maxLabel: string };
}

interface SubmitResult {
  attemptId: string;
  role: Role;
  label: string;
  name: string;
  submittedAt: string;
  completed: Record<string, boolean>;
  allCompleted: boolean;
  reports: ReportLink[];
}

type Step = 'loading' | 'error' | 'choose' | 'confirm' | 'answer' | 'done';

const ROLE_TONE: Record<Role, { card: string; badge: string; banner: string }> = {
  parent: {
    card: 'border-amber-300 bg-amber-50/60',
    badge: 'bg-amber-500 text-white',
    banner: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  student: {
    card: 'border-blue-300 bg-blue-50/60',
    badge: 'bg-blue-500 text-white',
    banner: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  teacher: {
    card: 'border-green-300 bg-green-50/60',
    badge: 'bg-green-600 text-white',
    banner: 'bg-green-50 text-green-800 border-green-200',
  },
};

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  const json = (await res.json()) as { success: boolean; data?: T; error?: string };
  if (!json.success || json.data === undefined) {
    throw new Error(json.error || '请求失败');
  }
  return json.data;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { success: boolean; data?: T; error?: string };
  if (!json.success || json.data === undefined) {
    throw new Error(json.error || '请求失败');
  }
  return json.data;
}

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DemoJoinClient() {
  const searchParams = useSearchParams();
  const code = (searchParams.get('c') ?? searchParams.get('code') ?? '').trim();

  const [step, setStep] = useState<Step>(() => (code ? 'loading' : 'error'));
  const [info, setInfo] = useState<JoinInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>(() =>
    code ? '' : '链接不完整，请让家长重新发送二维码'
  );
  const [selected, setSelected] = useState<RoleView | null>(null);
  const [name, setName] = useState('');
  const [claim, setClaim] = useState<Claim | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [dimIndex, setDimIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [copied, setCopied] = useState('');
  const loadInfo = useCallback(async () => {
    if (!code) {
      setErrorMsg('链接不完整，请让家长重新发送二维码');
      setStep('error');
      return;
    }
    try {
      const data = await apiGet<JoinInfo>(`/api/demo/join?c=${encodeURIComponent(code)}`);
      setInfo(data);
      setStep('choose');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '打开失败');
      setStep('error');
    }
  }, [code]);

  // 首次打开：拉这一场还缺哪些角色
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<JoinInfo>(
          `/api/demo/join?c=${encodeURIComponent(code)}`
        );
        if (cancelled) return;
        setInfo(data);
        setStep('choose');
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : '打开失败');
        setStep('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!claim) return;
    if (Object.keys(answers).length === 0) return;
    try {
      window.localStorage.setItem(
        `demo-join-answers:${claim.token}`,
        JSON.stringify(answers)
      );
    } catch {
      /* 忽略 */
    }
  }, [answers, claim]);

  const currentDimension = useMemo(
    () => claim?.dimensions[dimIndex] ?? null,
    [claim, dimIndex]
  );

  const pendingRoles = useMemo(
    () => info?.roles.filter((r) => r.status === 'pending') ?? [],
    [info]
  );

  const dimensionQuestions = currentDimension?.questions ?? [];
  const dimensionAnswered = dimensionQuestions.every((q) => answers[q.id] !== undefined);
  const allAnswered = useMemo(() => {
    if (!claim) return false;
    return claim.dimensions.every((dim) =>
      dim.questions.every((q) => answers[q.id] !== undefined)
    );
  }, [claim, answers]);

  const progress = claim
    ? ((dimIndex + 1) / Math.max(claim.dimensions.length, 1)) * 100
    : 0;

  // ── 领角色 ─────────────────────────────────────────────
  async function startAnswering() {
    if (!selected) return;
    setBusy(true);
    try {
      const claimed = await apiPost<Claim>(
        `/api/demo/join/${selected.role}`,
        { code, name: name.trim() || undefined }
      );
      setClaim(claimed);
      // 答题进度本地暂存：手机上误刷新/切后台不会丢答案
      let restored: Record<string, number> = {};
      try {
        const raw = window.localStorage.getItem(`demo-join-answers:${claimed.token}`);
        if (raw) restored = JSON.parse(raw) as Record<string, number>;
      } catch {
        /* 本地存储不可用就算了，不影响作答 */
      }
      setAnswers(restored);
      setDimIndex(0);
      setStep('answer');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '领取失败';
      setErrorMsg(msg);
      // 角色被抢走 / 已完成 → 回到选择页并刷新状态
      if (msg.includes('提交') || msg.includes('填完')) {
        setStep('choose');
        void loadInfo();
      } else {
        setStep('error');
      }
    } finally {
      setBusy(false);
    }
  }

  // ── 提交 ─────────────────────────────────────────────
  async function submit() {
    if (!claim) return;
    setBusy(true);
    try {
      const submitted = await apiPost<SubmitResult>('/api/demo/join/submit', {
        token: claim.token,
        answers,
      });
      setResult(submitted);
      setStep('done');
      try {
        window.localStorage.removeItem(`demo-join-answers:${claim.token}`);
      } catch {
        /* 忽略 */
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提交失败';
      // 名额被别人抢走 → 回选择页刷新
      if (msg.includes('提交') || msg.includes('别人')) {
        setErrorMsg(msg);
        setStep('choose');
        void loadInfo();
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  // ── 撤销（我选错了） ─────────────────────────────────
  async function voidSubmit() {
    if (!claim) return;
    setBusy(true);
    try {
      const undone = await apiPost<{ role: Role; label: string }>(
        '/api/demo/join/void',
        { token: claim.token }
      );
      setErrorMsg(`已撤销「${undone.label}」，请重新选择你要填的卷子`);
      setClaim(null);
      setAnswers({});
      setResult(null);
      setStep('choose');
      void loadInfo();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '撤销失败');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(url: string, key: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
    }
  }

  // ── 渲染 ─────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          <p className="mt-4 text-stone-500 text-sm">正在打开测评…</p>
        </div>
      </Shell>
    );
  }

  if (step === 'error') {
    return (
      <Shell>
        <div className="mt-16 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-2xl">
            ⚠️
          </div>
          <p className="mt-4 text-stone-700">{errorMsg}</p>
          <p className="mt-2 text-sm text-stone-400">
            请让家长重新在机器上生成二维码
          </p>
        </div>
      </Shell>
    );
  }

  if (step === 'choose' && info) {
    return (
      <Shell>
        <header className="text-center">
          <p className="text-xs text-stone-400">学习状态测评</p>
          <h1 className="mt-1 text-xl font-bold text-stone-800">
            {info.childName} · {info.stageName}
          </h1>
          <p className="mt-1 text-xs text-stone-400">
            本链接 {formatExpiry(info.expiresAt)} 前有效
          </p>
        </header>

        <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          请选择<b>你的身份</b>，然后用手机作答。
          {pendingRoles.length > 0 && '（选错了可以返回重选，提交前都算数）'}
        </div>

        <div className="mt-4 space-y-3">
          {info.roles.map((role) => {
            const tone = ROLE_TONE[role.role];
            const done = role.status === 'completed';
            return (
              <button
                key={role.role}
                type="button"
                disabled={done}
                onClick={() => {
                  setSelected(role);
                  setName('');
                  setStep('confirm');
                }}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  done
                    ? 'border-stone-200 bg-stone-50 opacity-70'
                    : `${tone.card} active:scale-[0.99] shadow-sm`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      done ? 'bg-stone-200 text-stone-500' : tone.badge
                    }`}
                  >
                    {done ? '已完成' : role.label}
                  </span>
                  {!done && <span className="text-stone-400 text-sm">共 {role.totalQuestions} 题 ›</span>}
                </div>
                <p className="mt-2 font-semibold text-stone-800">
                  {done ? `${role.label} 已完成` : role.who}
                </p>
                <p className="mt-1 text-sm text-stone-500">{role.desc}</p>
                <p className="mt-2 text-xs text-stone-400 line-clamp-2">
                  例：{role.sample}
                </p>
              </button>
            );
          })}
        </div>

        {info.allCompleted && (
          <ReportList reports={info.reports} copied={copied} onCopy={copyLink} />
        )}
      </Shell>
    );
  }

  if (step === 'confirm' && selected) {
    const tone = ROLE_TONE[selected.role];
    return (
      <Shell>
        <header className="text-center">
          <p className="text-xs text-stone-400">确认你要填的卷子</p>
          <h1 className="mt-1 text-xl font-bold text-stone-800">{selected.label}</h1>
        </header>

        <div className={`mt-5 rounded-2xl border p-4 ${tone.banner}`}>
          <p className="font-semibold">{selected.who}</p>
          <p className="mt-1 text-sm opacity-90">{selected.desc}</p>
          <p className="mt-3 text-sm bg-white/70 rounded-lg p-3">例：{selected.sample}</p>
          <p className="mt-2 text-xs opacity-80">
            这份卷共 {selected.totalQuestions} 题，全部作答后才能提交。
          </p>
        </div>

        <label className="block mt-5">
          <span className="text-sm text-stone-600">
            你的名字（选填，方便家长对账）
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="例如：张老师 / 小明妈妈"
            className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-800 focus:outline-none focus:border-amber-500"
          />
        </label>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => void startAnswering()}
            disabled={busy}
            className="w-full rounded-xl bg-amber-500 py-4 font-semibold text-white shadow-md active:bg-amber-600 disabled:opacity-60"
          >
            {busy ? '准备中…' : '开始作答'}
          </button>
          <button
            type="button"
            onClick={() => setStep('choose')}
            className="w-full rounded-xl border border-stone-300 py-3 text-stone-500"
          >
            ← 选错了，返回重选
          </button>
        </div>
      </Shell>
    );
  }

  if (step === 'answer' && claim && currentDimension) {
    const tone = ROLE_TONE[claim.role];
    const isLast = dimIndex === claim.dimensions.length - 1;
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-16">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-stone-200">
          <div className="mx-auto max-w-md px-5 py-3">
            <div className={`rounded-lg border px-3 py-2 text-sm ${tone.banner}`}>
              <b>{claim.label}</b> · {claim.who}
            </div>
            <div className="mt-2 h-2 rounded-full bg-stone-200">
              <div
                className="h-2 rounded-full bg-amber-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
              <span>
                第 {dimIndex + 1} / {claim.dimensions.length} 个维度 · 已答{' '}
                {Object.keys(answers).length} / {claim.totalQuestions}
              </span>
              <button
                type="button"
                onClick={() => {
                  setClaim(null);
                  setStep('choose');
                  void loadInfo();
                }}
                className="underline"
              >
                退出
              </button>
            </div>
            <h1 className="mt-2 text-base font-semibold text-stone-800">
              {currentDimension.name}
            </h1>
            <p className="text-xs text-stone-500">{currentDimension.description}</p>
          </div>
        </header>

        <main className="mx-auto max-w-md px-5 py-5 space-y-4">
          {dimensionQuestions.map((q, i) => (
            <div key={q.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-3 text-stone-700">
                <span className="mr-1 text-amber-500">{i + 1}.</span>
                {q.text}
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: v }))
                    }
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-medium transition-all ${
                      answers[q.id] === v
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-stone-100 text-stone-600 active:bg-stone-200'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-stone-400">
                <span>非常不符合</span>
                <span>非常符合</span>
              </div>
            </div>
          ))}
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-stone-200 px-5 py-3">
          <div className="mx-auto max-w-md flex gap-3">
            {dimIndex > 0 && (
              <button
                type="button"
                onClick={() => setDimIndex((i) => i - 1)}
                className="flex-1 rounded-xl border border-stone-300 py-3 font-medium text-stone-600"
              >
                上一维
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!allAnswered || busy}
                className={`flex-1 rounded-xl py-3 font-semibold text-white transition-all ${
                  allAnswered && !busy
                    ? 'bg-amber-500 active:bg-amber-600 shadow-md'
                    : 'bg-stone-200 text-stone-400'
                }`}
              >
                {busy ? '提交中…' : '提交'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDimIndex((i) => i + 1)}
                disabled={!dimensionAnswered}
                className={`flex-1 rounded-xl py-3 font-semibold transition-all ${
                  dimensionAnswered
                    ? 'bg-amber-500 text-white active:bg-amber-600 shadow-md'
                    : 'bg-stone-200 text-stone-400'
                }`}
              >
                下一维
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done' && result) {
    return (
      <Shell>
        <div className="text-center pt-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center text-2xl">
            ✓
          </div>
          <h1 className="mt-4 text-xl font-bold text-stone-800">提交成功</h1>
          <p className="mt-1 text-sm text-stone-500">
            你完成的是「{result.label}」
            {result.name ? ` · ${result.name}` : ''}
          </p>
        </div>

        {result.allCompleted ? (
          <>
            <div className="mt-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              三份都齐了！下面三个链接是只读报告，24 小时内有效，可以转发给家长或老师。
            </div>
            <ReportList reports={result.reports} copied={copied} onCopy={copyLink} />
          </>
        ) : (
          <div className="mt-6 rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
            等待其他角色完成。三份都完成后，这里会出现报告链接。
            <button
              type="button"
              onClick={() => {
                setStep('choose');
                void loadInfo();
              }}
              className="mt-2 block underline"
            >
              返回查看进度
            </button>
          </div>
        )}

        {errorMsg && (
          <p className="mt-4 text-center text-xs text-stone-500">{errorMsg}</p>
        )}

        {/* 选错了的救命通道：撤销自己刚提交的那一份，重新选角色 */}
        <div className="mt-6 border-t border-stone-200 pt-4 text-center">
          <button
            type="button"
            onClick={() => void voidSubmit()}
            disabled={busy}
            className="text-sm text-stone-400 underline disabled:opacity-50"
          >
            {busy ? '处理中…' : '选错了？撤销这一份，重新选一次'}
          </button>
          <p className="mt-1 text-[11px] text-stone-300">
            只有提交者本人可以撤销，撤销后该份卷重新开放
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="mt-10 text-center text-stone-500">页面状态异常，请重新扫码</p>
    </Shell>
  );
}

function ReportList({
  reports,
  copied,
  onCopy,
}: {
  reports: ReportLink[];
  copied: string;
  onCopy: (url: string, key: string) => void;
}) {
  if (!reports || reports.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-stone-700">报告链接（只读 · 24 小时有效）</h2>
      <div className="mt-2 space-y-2">
        {reports.map((r) => (
          <div
            key={r.code}
            className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-700">{r.label}</p>
              <p className="truncate text-xs text-stone-400">{r.url}</p>
            </div>
            <button
              type="button"
              onClick={() => onCopy(r.url, r.code)}
              className="shrink-0 rounded-lg bg-stone-100 px-3 py-1.5 text-xs text-stone-600"
            >
              {copied === r.code ? '已复制' : '复制'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <main className="mx-auto w-full max-w-md px-5 py-8">{children}</main>
    </div>
  );
}
