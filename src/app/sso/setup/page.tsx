'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setToken } from '@/lib/api/client';

// 体系账号登录后的补全注册：设密码 + 填孩子信息
// 手机号已由体系账号验证过，这里只读展示，不允许修改
export default function SsoSetupPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>('');
  const [childName, setChildName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // 预置信息随一次性 cookie 传递，页面加载时先取回来
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/portal/exchange', { method: 'POST' });
        const json = await res.json();
        if (!json.success || !json.data?.token) {
          setError(json.error || '登录凭证已失效');
          return;
        }
        setToken(json.data.token);
        setUserId(json.data.userId || null);
        setPhone(json.data.phone || '');
        setReady(true);
      } catch {
        setError('登录凭证已失效');
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userId) {
      setError('登录信息已失效，请重新登录');
      return;
    }
    if (!childName.trim()) {
      setError('请填写孩子姓名');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          phone,
          password,
          child: { name: childName.trim() },
        }),
      });
      const json = await response.json();

      if (!json.success) {
        setError(json.error || '注册失败');
        return;
      }

      setToken(json.data.token);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
      <header className="px-6 py-8 text-center">
        <h1 className="text-2xl font-bold text-stone-800">完善信息</h1>
        <p className="mt-2 text-stone-500">设置密码后即可开始测评</p>
      </header>

      <main className="mx-auto w-full max-w-sm px-6 flex-1">
        {error ? (
          <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm mb-4">{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">手机号</label>
            <input
              type="tel"
              value={phone}
              readOnly
              disabled
              placeholder="由体系账号验证"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              孩子姓名
            </label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="请输入孩子姓名"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              设置密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6位"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入密码"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition disabled:opacity-50"
          >
            {loading ? '提交中...' : '完成'}
          </button>
        </form>
      </main>
    </div>
  );
}
