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
      setInitError('无效的注册链接');
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, phone, password, referralCode: storedRefCode }),
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
