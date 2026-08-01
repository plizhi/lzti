'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken } from '@/lib/api/client';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shareId = searchParams.get('share');
  const slotCode = searchParams.get('slot');
  const referralCode = searchParams.get('ref');

  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState('');

  // 在 step 2 时从 localStorage 获取 referralCode
  const [storedRefCode, setStoredRefCode] = useState<string | null>(null);

  // 存储 referralCode 到 localStorage（如果有的话）
  useEffect(() => {
    if (referralCode) {
      localStorage.setItem('referralCode', referralCode);
      setStoredRefCode(referralCode);
    } else {
      // 如果没有 URL 参数，尝试从 localStorage 获取
      const stored = localStorage.getItem('referralCode');
      if (stored) {
        setStoredRefCode(stored);
      }
    }
  }, [referralCode]);

  // 初始化：激活 Slot 并创建预账户
  useEffect(() => {
    if (!shareId || !slotCode) {
      setInitError('');
      setStep(0); // 表示是直接访问，需要邀请码
      return;
    }

    const initRegistration = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/register', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotCode }),
        });
        const json = await response.json();

        if (!json.success) {
          setInitError(json.error || '激活失败');
          return;
        }

        setUserId(json.data.userId);
        setStep(2);
      } catch (err) {
        setInitError('初始化注册失败');
      } finally {
        setLoading(false);
      }
    };

    initRegistration();
  }, [shareId, slotCode]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 直接从 localStorage 获取，避免 state 同步延迟问题
      const refCode = localStorage.getItem('referralCode');

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, phone, password, referralCode: refCode }),
      });
      const json = await response.json();

      if (!json.success) {
        setError(json.error || '注册失败');
        return;
      }

      // 注册成功后清除 referralCode
      localStorage.removeItem('referralCode');

      setToken(json.data.token);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  // 直接访问注册页（无邀请码）
  if (step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
        <header className="px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-stone-800">注册</h1>
        </header>
        <main className="mx-auto w-full max-w-sm px-6 flex-1 flex flex-col items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-stone-800">需要邀请码才能注册</h2>
            <p className="text-stone-500 text-sm leading-relaxed">
              我们的测评服务采用邀请制，请联系您的邀请人获取邀请码。
            </p>
          </div>

          <div className="mt-8 w-full space-y-3">
            <a
              href="mailto:contact@lizhi-eval.com?subject=申请邀请码&body=您好，我想申请试用荔枝测评，请发送邀请码给我。%0A%0A姓名：%0A联系方式："
              className="block w-full py-3 rounded-xl bg-amber-500 text-white font-medium text-center hover:bg-amber-600 transition"
            >
              邮件申请邀请码
            </a>
            <Link
              href="/login"
              className="block w-full py-3 rounded-xl border border-stone-300 text-stone-700 font-medium text-center hover:bg-stone-50 transition"
            >
              已有账号？登录
            </Link>
          </div>

          <Link href="/" className="mt-8 text-stone-500 hover:text-stone-700">
            ← 返回首页
          </Link>
        </main>
      </div>
    );
  }

  // 初始化失败
  if (initError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
        <header className="px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-stone-800">注册</h1>
        </header>
        <main className="mx-auto w-full max-w-sm px-6 flex-1 flex flex-col items-center justify-center">
          <div className="p-4 rounded-xl bg-red-50 text-red-600 text-center">
            <p>{initError}</p>
          </div>
          <Link href="/login" className="mt-4 text-amber-600 hover:underline">
            已有账号？登录
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
      <header className="px-6 py-8 text-center">
        <h1 className="text-2xl font-bold text-stone-800">注册</h1>
        <p className="mt-2 text-stone-500">
          {step === 1 ? '正在初始化...' : '完善信息'}
        </p>
      </header>

      <main className="mx-auto w-full max-w-sm px-6 flex-1">
        {step === 1 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
            <p className="mt-4 text-stone-500">正在准备注册...</p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="p-3 rounded-xl bg-green-50 text-green-700 text-sm">
              邀请码验证通过
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                手机号
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6-20位密码"
                minLength={6}
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition disabled:opacity-50"
            >
              {loading ? '注册中...' : '完成注册'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-stone-500 text-sm">
            已有账号？{' '}
            <Link href="/login" className="text-amber-600 hover:underline">
              立即登录
            </Link>
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="block text-center text-stone-500 hover:text-stone-700"
          >
            ← 返回首页
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
