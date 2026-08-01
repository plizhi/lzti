'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllStages } from '@/data/questionnaires';
import { auth, removeToken, isLoggedIn } from '@/lib/api/client';

export default function Home() {
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">荔枝测评</h1>
          <p className="text-sm text-stone-500">一骑红尘笑，荔途自扶摇</p>
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
              className="px-4 py-2 rounded-full text-stone-600 hover:bg-amber-100 transition"
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

      <main>
        {/* Hero Section */}
        <section className="px-6 py-12 text-center">
          <h2 className="text-2xl font-bold text-stone-800 leading-relaxed">
            孩子取得好成绩的关键究竟是什么？
          </h2>
          <p className="mt-4 text-lg text-stone-600">
            一对陪伴孩子裸分考上清华的家长告诉你：
          </p>
          <p className="mt-2 text-xl text-amber-700 font-medium">
            一个内在结构稳定有活力的孩子，<br />更容易取得成绩上的好表现。
          </p>
          <p className="mt-6 text-stone-600">
            荔学卷帮你看见——你的孩子内在结构是什么样的。
          </p>
          <div className="mt-8">
            <Link
              href={loggedIn ? '/select-child/primary-low' : '/register'}
              className="inline-block rounded-full bg-amber-500 px-8 py-3 text-lg font-medium text-white shadow-lg hover:bg-amber-600 transition-colors"
            >
              3分钟，看见真实的孩子
            </Link>
          </div>
        </section>

        {/* What is Inner Structure Section */}
        <section className="px-6 py-12 bg-white">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-stone-800 text-center">
              什么是内在结构？
            </h3>
            <p className="mt-4 text-stone-600">
              孩子从小学到高三的12年，不是在"学知识"，而是在完成六个内在结构的建设。
            </p>
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-4">
                <span className="text-2xl">🌱</span>
                <div>
                  <p className="font-medium text-stone-800">小学低年级 — 勤勉感</p>
                  <p className="text-sm text-stone-600">相信"我能通过努力把一件事做好"</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-2xl">🌿</span>
                <div>
                  <p className="font-medium text-stone-800">小学高年级 — 胜任感</p>
                  <p className="text-sm text-stone-600">相信"方法能让事情变容易"</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-2xl">🌳</span>
                <div>
                  <p className="font-medium text-stone-800">初中 — 自我管理结构</p>
                  <p className="text-sm text-stone-600">能统筹多门功课，有自己的目标和规划</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="font-medium text-stone-800">初三 — 压力整合结构</p>
                  <p className="text-sm text-stone-600">在压力下，把已有能力转化为实战表现</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="font-medium text-stone-800">高一高二 — 意义结构</p>
                  <p className="text-sm text-stone-600">了解自己，学习的动力转向"为自己而学"</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-2xl">🦅</span>
                <div>
                  <p className="font-medium text-stone-800">高三 — 选择与承担结构</p>
                  <p className="text-sm text-stone-600">能做出自己的选择，并为之负责</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What is Inner Structure Nurturing Section */}
        <section className="px-6 py-12 bg-amber-50">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-semibold text-stone-800">
              什么是内在结构养育？
            </h3>
            <p className="mt-4 text-stone-600">
              面对孩子的任何表现，先问：这对他正在建立的内在结构，是加固还是削弱？
            </p>
            <p className="mt-4 text-stone-600">
              养育的目标不是塑造孩子的外在表现，而是帮助孩子建立起支撑一生的内在心理结构。
            </p>
            <p className="mt-4 text-stone-600">
              在合适的时机，给合适的支持。
            </p>
          </div>
        </section>

        {/* Three Perspectives Section */}
        <section className="px-6 py-12 bg-amber-50">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-center text-lg font-semibold text-stone-800 mb-8">
              三双眼睛，看见完整的孩子
            </h3>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <div className="text-4xl mb-4">👦</div>
                <h4 className="font-medium text-stone-800">孩子</h4>
                <p className="mt-2 text-sm text-stone-600">
                  他内心的感受<br />他的信念和想法
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <div className="text-4xl mb-4">👨‍👩‍👧</div>
                <h4 className="font-medium text-stone-800">家长</h4>
                <p className="mt-2 text-sm text-stone-600">
                  家庭场景中<br />能观察到的行为
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <div className="text-4xl mb-4">👩‍🏫</div>
                <h4 className="font-medium text-stone-800">老师</h4>
                <p className="mt-2 text-sm text-stone-600">
                  课堂和校园中<br />能观察到的表现
                </p>
              </div>
            </div>
            <p className="mt-8 text-center text-stone-600">
              三方视角拼在一起，才是孩子完整的样子。
            </p>
          </div>
        </section>

        {/* Core Value Section */}
        <section className="px-6 py-12 bg-white">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-semibold text-stone-800">
              看见真实的孩子，看见真实状态
            </h3>
            <p className="mt-4 text-stone-600">
              成绩是属于孩子的。家长能做的，是支持。
              <br />
              只有看见了，才懂得如何去支持孩子取得世俗意义上的良好表现。
            </p>
          </div>
        </section>

        {/* Stage Selection */}
        <section className="px-6 py-12 bg-stone-100">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-center text-lg font-semibold text-stone-800 mb-8">
              选择孩子的学段，开始测评
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {stages.map((stage) => (
                <Link
                  key={stage.id}
                  href={loggedIn ? `/select-child/${stage.id}` : `/register`}
                  className="group bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-stone-800 group-hover:text-amber-600">
                        {stage.name}
                      </h4>
                      <p className="text-sm text-stone-500 mt-1">{stage.gradeRange}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                      {stage.dimensionCount}维度
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{stage.description}</p>
                  <p className="mt-2 text-xs text-amber-600">
                    核心能力：{stage.coreAbility}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Slogan Section */}
        <section className="px-6 py-12 text-center">
          <p className="text-2xl text-stone-700 italic">
            一骑红尘笑，荔途自扶摇
          </p>
          <p className="mt-4 text-stone-600">
            在合适的时机，给合适的支持
          </p>
        </section>

        {/* Bottom CTA */}
        <section className="px-6 py-12 bg-amber-500 text-white text-center">
          <h3 className="text-xl font-semibold">
            准备好看见真实的孩子了吗？
          </h3>
          <p className="mt-2 text-amber-100">
            3分钟测评，看见孩子本来的样子
          </p>
          <div className="mt-6">
            <Link
              href={loggedIn ? '/select-child/primary-low' : '/register'}
              className="inline-block rounded-full bg-white px-8 py-3 text-amber-700 font-medium hover:bg-amber-50 transition-colors"
            >
              开始测评
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-8 text-center text-sm text-stone-500">
          <p>© 2026 内在结构养育 · 朋大大 & 杨莉老师</p>
          <p className="mt-2">
            <Link href="/privacy" className="hover:text-stone-700">隐私政策</Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="hover:text-stone-700">服务条款</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
