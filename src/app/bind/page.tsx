'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setToken } from '@/lib/api/client';

function BindContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const bind = async () => {
      const from = searchParams.get('from');
      const token = searchParams.get('token');

      if (from !== 'nzyy' || !token) {
        setStatus('error');
        setError('参数错误');
        return;
      }

      try {
        const res = await fetch('/api/bind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, token }),
        });

        const json = await res.json();

        if (json.success) {
          setToken(json.data.token);
          router.push('/');
        } else {
          setStatus('error');
          setError(json.error || '绑定失败');
        }
      } catch {
        setStatus('error');
        setError('网络错误');
      }
    };

    bind();
  }, [searchParams, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔗</div>
          <p className="text-stone-600">正在连接...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
      <div className="text-center p-8">
        <div className="text-4xl mb-4">❌</div>
        <h1 className="text-xl font-semibold text-stone-700 mb-2">绑定失败</h1>
        <p className="text-stone-600 mb-4">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}

function BindLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🔗</div>
        <p className="text-stone-600">正在连接...</p>
      </div>
    </div>
  );
}

export default function BindPage() {
  return (
    <Suspense fallback={<BindLoading />}>
      <BindContent />
    </Suspense>
  );
}
