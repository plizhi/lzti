'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/api/client';

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  totalChildren: number;
  totalSessions: number;
  totalAttempts: number;
  todayUsers: number;
  todayAttempts: number;
  sessionsByStage: Array<{ stageId: string; count: number }>;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('lzti_token')}`,
          },
        });
        const json = await response.json();

        if (json.success) {
          setStats(json.data);
        } else {
          setError(json.error || '获取数据失败');
        }
      } catch (err) {
        setError('获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col items-center justify-center p-8">
        <div className="text-red-600 mb-4">{error}</div>
        <Link href="/" className="text-amber-600 hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-stone-500 hover:text-stone-700">
              ← 返回
            </Link>
            <h1 className="text-lg font-semibold text-stone-800">管理后台</h1>
            <div />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="text-2xl font-bold text-stone-800 mb-6">数据概览</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="总用户数" value={stats?.totalUsers ?? 0} color="amber" />
          <StatCard label="待激活账户" value={stats?.pendingUsers ?? 0} color="orange" />
          <StatCard label="孩子档案" value={stats?.totalChildren ?? 0} color="green" />
          <StatCard label="测评会话" value={stats?.totalSessions ?? 0} color="blue" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="今日新增用户" value={stats?.todayUsers ?? 0} color="purple" />
          <StatCard label="今日测评次数" value={stats?.todayAttempts ?? 0} color="pink" />
          <StatCard label="总测评次数" value={stats?.totalAttempts ?? 0} color="indigo" />
          <StatCard label="平均每用户测评" value={
            stats?.totalUsers ? (stats.totalAttempts / stats.totalUsers).toFixed(1) : '0'
          } color="teal" />
        </div>

        <h3 className="text-lg font-semibold text-stone-800 mb-4">各学段分布</h3>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="space-y-3">
            {stats?.sessionsByStage.map((s) => (
              <div key={s.stageId} className="flex items-center justify-between">
                <span className="text-stone-600">{s.stageId}</span>
                <span className="font-medium text-amber-600">{s.count} 次</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="text-center py-4 rounded-xl bg-white shadow-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            用户管理
          </Link>
          <Link
            href="/admin/export"
            className="text-center py-4 rounded-xl bg-white shadow-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            数据导出
          </Link>
          <Link
            href="/admin/feedback"
            className="text-center py-4 rounded-xl bg-white shadow-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            反馈管理
          </Link>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    pink: 'bg-pink-50 text-pink-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    teal: 'bg-teal-50 text-teal-600',
  };

  return (
    <div className={`rounded-2xl p-6 ${colorClasses[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm mt-1 opacity-80">{label}</div>
    </div>
  );
}
