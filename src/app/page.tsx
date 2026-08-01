'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllStages } from '@/data/questionnaires';
import { auth, removeToken, isLoggedIn } from '@/lib/api/client';

export default function Home() {
  const router = useRouter();
  const stages = getAllStages();
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<{ name: string | null; children: any[] } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (isLoggedIn()) {
      try {
        const userData = await auth.me();
        setLoggedIn(true);
        setUser(userData);
      } catch {
        removeToken();
        setLoggedIn(false);
      }
    }
  };

  const handleLogout = () => {
    removeToken();
    setLoggedIn(false);
    setUser(null);
    setShowUserMenu(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="px-6 py-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">学习状态评估</h1>
          <p className="mt-2 text-stone-500">选择孩子的学段开始测评</p>
        </div>

        {loggedIn ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition"
            >
              <span className="text-lg">👤</span>
              <span className="font-medium">
                {user?.name || user?.children?.[0]?.name || '用户'}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-lg border border-stone-200 py-2 z-50">
                <Link
                  href="/children"
                  onClick={() => setShowUserMenu(false)}
                  className="block px-4 py-2 text-stone-700 hover:bg-stone-50"
                >
                  👶 孩子管理
                </Link>
                <Link
                  href="/history"
                  onClick={() => setShowUserMenu(false)}
                  className="block px-4 py-2 text-stone-700 hover:bg-stone-50"
                >
                  📋 测评历史
                </Link>
                <Link
                  href="/membership"
                  onClick={() => setShowUserMenu(false)}
                  className="block px-4 py-2 text-stone-700 hover:bg-stone-50"
                >
                  👤 我的
                </Link>
                <hr className="my-2 border-stone-100" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Link
              href="/login"
              className="px-4 py-2 rounded-full text-amber-700 hover:bg-amber-100 transition"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition"
            >
              注册
            </Link>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-12">
        {!loggedIn && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-amber-800">用3分钟，看见孩子的学习状态</h3>
                <p className="text-sm text-amber-700 mt-1">
                  不看分数，看本质——基于内在结构养育理论
                </p>
              </div>
              <Link
                href="https://nzyy.cc"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600 transition-colors"
              >
                了解更多
              </Link>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {stages.map((stage) => (
            <Link
              key={stage.id}
              href={loggedIn ? `/select-child/${stage.id}` : `/login`}
              className="group block rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-stone-800 group-hover:text-amber-600">
                    {stage.name}
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">{stage.gradeRange}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                  {stage.dimensionCount}维度
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-600">{stage.description}</p>
              <p className="mt-3 text-xs text-amber-600">
                核心能力：{stage.coreAbility}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex gap-4">
          {loggedIn ? (
            <Link
              href="/history"
              className="flex-1 rounded-xl border border-stone-300 bg-white py-4 text-center font-medium text-stone-600 transition-colors hover:bg-stone-50"
            >
              📋 查看历史记录
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex-1 rounded-xl border border-stone-300 bg-white py-4 text-center font-medium text-stone-600 transition-colors hover:bg-stone-50"
            >
              📋 登录查看历史
            </Link>
          )}
        </div>

        <div className="mt-8 rounded-xl bg-stone-100 p-4">
          <h3 className="font-medium text-stone-700">关于测评</h3>
          <p className="mt-2 text-sm text-stone-600">
            本测评基于「内在结构养育理论」，从多个维度评估孩子的学习状态。
            完成测评后，您将获得个性化的分析报告和引导建议。
          </p>
        </div>
      </main>
    </div>
  );
}
