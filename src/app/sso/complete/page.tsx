'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setToken } from '@/lib/api/client';

// SSO 回调落地页：拿一次性 cookie 里的 token 换成正式登录态
export default function SsoCompletePage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/portal/exchange', { method: 'POST' });
        const json = await res.json();
        if (!json.success || !json.data?.token) {
          throw new Error(json.error || '登录凭证已失效');
        }
        setToken(json.data.token);
        if (cancelled) return;

        router.replace('/');
      } catch (e) {
        const msg = e instanceof Error ? e.message : '登录失败';
        if (!cancelled) setError(msg);
      }
    })();

    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center px-6">
      {error ? (
        <div className="text-center">
          <p className="text-stone-600 mb-4">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="px-6 py-2.5 rounded-xl bg-stone-800 text-white text-sm font-medium"
          >
            返回登录
          </button>
        </div>
      ) : (
        <p className="text-stone-500 text-sm">正在登录…</p>
      )}
    </div>
  );
}
