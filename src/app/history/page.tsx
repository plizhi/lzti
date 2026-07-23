'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStage, getAllStages } from '@/data/questionnaires';
import { getAttemptHistory, clearAttemptHistory, type StoredAttempt } from '@/lib/storage';

const typeLabels: Record<string, string> = {
  student: '学生自评',
  parent: '家长观察',
  teacher: '教师评价',
};

export default function HistoryPage() {
  const [attempts, setAttempts] = useState<StoredAttempt[]>([]);

  useEffect(() => {
    setAttempts(getAttemptHistory());
  }, []);

  const handleClearHistory = () => {
    if (confirm('确定要清除所有历史记录吗？此操作不可恢复。')) {
      clearAttemptHistory();
      setAttempts([]);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStageName = (stageId: string) => {
    return getStage(stageId as any)?.name ?? stageId;
  };

  const getTrendIcon = (current: number, previous: number) => {
    const diff = current - previous;
    if (Math.abs(diff) < 3) return '→';
    return diff > 0 ? '↑' : '↓';
  };

  // 按学段分组
  const groupedAttempts = attempts.reduce((acc, attempt) => {
    if (!acc[attempt.stageId]) {
      acc[attempt.stageId] = [];
    }
    acc[attempt.stageId].push(attempt);
    return acc;
  }, {} as Record<string, StoredAttempt[]>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-stone-500 hover:text-stone-700">
              ← 返回首页
            </Link>
            <h1 className="text-lg font-semibold text-stone-800">测评历史</h1>
            <button
              onClick={handleClearHistory}
              className="text-sm text-red-500 hover:text-red-600"
            >
              清除
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {attempts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-stone-600">暂无测评记录</p>
            <p className="text-sm text-stone-500 mt-2">完成测评后会显示在这里</p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-amber-500 px-6 py-3 font-medium text-white hover:bg-amber-600"
            >
              开始测评
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAttempts).map(([stageId, stageAttempts]) => (
              <div key={stageId} className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-stone-800 mb-4">
                  {getStageName(stageId)}
                </h2>
                <div className="space-y-3">
                  {stageAttempts.map((attempt, index) => {
                    const previousAttempt = stageAttempts[index + 1];
                    return (
                      <Link
                        key={attempt.id}
                        href={`/report/${attempt.id}`}
                        className="block rounded-xl border border-stone-200 p-4 transition-all hover:border-amber-300 hover:bg-amber-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-stone-700">
                                {typeLabels[attempt.questionnaireType] ?? '学生自评'}
                              </span>
                              {previousAttempt && (
                                <span className="text-xs text-stone-400">
                                  ← 上次
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-stone-500">
                              {formatDate(attempt.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex gap-1">
                              {Object.entries(attempt.quadrants).map(([dimId, quadrant]) => (
                                <span
                                  key={dimId}
                                  className={`inline-block w-2 h-2 rounded-full ${
                                    quadrant === 'optimal'
                                      ? 'bg-green-500'
                                      : quadrant === 'strategy'
                                        ? 'bg-amber-500'
                                        : quadrant === 'passive'
                                          ? 'bg-stone-400'
                                          : 'bg-red-500'
                                  }`}
                                  title={dimId}
                                />
                              ))}
                            </div>
                            <p className="mt-1 text-xs text-stone-400">
                              {formatDate(attempt.createdAt).split(' ')[0]}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-xl bg-stone-100 p-4">
          <h3 className="font-medium text-stone-700">关于历史记录</h3>
          <p className="mt-2 text-sm text-stone-600">
            测评历史保存在本地浏览器中，更换设备或清除浏览器数据会导致记录丢失。
            如需永久保存，请联系管理员开通账号。
          </p>
        </div>
      </main>
    </div>
  );
}
