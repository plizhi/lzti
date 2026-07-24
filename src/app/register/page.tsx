'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, invitationCodes, setToken } from '@/lib/api/client';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [childName, setChildName] = useState('');
  const [childGrade, setChildGrade] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckInvitationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await invitationCodes.validate(invitationCode);
      if (!result.valid) {
        setError(result.error || '邀请码无效');
        return;
      }
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await auth.register({
        phone,
        password,
        invitationCode,
        child: {
          name: childName,
          grade: childGrade,
        },
      });
      setToken(result.token);
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
        <h1 className="text-2xl font-bold text-stone-800">注册</h1>
        <p className="mt-2 text-stone-500">
          {step === 1 ? '验证邀请码' : '填写信息'}
        </p>
      </header>

      <main className="mx-auto w-full max-w-sm px-6 flex-1">
        {step === 1 ? (
          <form onSubmit={handleCheckInvitationCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                邀请码
              </label>
              <input
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="请输入6位邀请码"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition text-center text-lg tracking-widest"
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
              disabled={loading || invitationCode.length !== 6}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition disabled:opacity-50"
            >
              {loading ? '验证中...' : '下一步'}
            </button>
          </form>
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

            <div className="border-t border-stone-200 pt-4 mt-4">
              <p className="text-sm text-stone-500 mb-3">孩子的信息</p>

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

              <div className="mt-3">
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  年级
                </label>
                <select
                  value={childGrade}
                  onChange={(e) => setChildGrade(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
                  required
                >
                  <option value="">请选择年级</option>
                  <option value="一年级">一年级</option>
                  <option value="二年级">二年级</option>
                  <option value="三年级">三年级</option>
                  <option value="四年级">四年级</option>
                  <option value="五年级">五年级</option>
                  <option value="六年级">六年级</option>
                  <option value="初一">初一</option>
                  <option value="初二">初二</option>
                  <option value="初三">初三</option>
                  <option value="高一">高一</option>
                  <option value="高二">高二</option>
                  <option value="高三">高三</option>
                </select>
              </div>
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

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-2 text-stone-500 hover:text-stone-700 text-sm"
            >
              ← 返回上一步
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
