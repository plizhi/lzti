'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ReferralPanel } from '@/components/share/ReferralPanel';
import { ReminderPanel } from '@/components/share/ReminderPanel';

interface MembershipStatus {
  hasSubscription: boolean;
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | null;
  subscriptionExpiresAt: string | null;
  bonusAttempts: number;
  bonusUsed: number;
  bonusRemaining: number;
  totalAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
}

export default function MembershipPage() {
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);

  useEffect(() => {
    fetchMembershipStatus();
  }, []);

  const fetchMembershipStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('lzti_token')}`,
        },
      });
      const json = await response.json();
      if (json.success) {
        // 用户 API 没有返回完整的 membership 状态
        // 这里需要调用专门的 membership API 或者在用户信息中包含
        // 暂时使用默认值
        setMembership({
          hasSubscription: false,
          subscriptionStatus: null,
          subscriptionExpiresAt: null,
          bonusAttempts: json.data.bonusAttempts ?? 0,
          bonusUsed: json.data.bonusUsed ?? 0,
          bonusRemaining: (json.data.bonusAttempts ?? 0) - (json.data.bonusUsed ?? 0),
          totalAttempts: 0,
          attemptsUsed: 0,
          attemptsRemaining: 0,
        });
      }
    } catch (err) {
      console.error('获取会员状态失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-12">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-stone-500 hover:text-stone-700">
              ← 返回
            </Link>
            <h1 className="text-lg font-semibold text-stone-800">我的</h1>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        {/* 会员状态卡片 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">成长陪伴会员</h2>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : membership?.hasSubscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-500">状态</p>
                  <p className="text-lg font-semibold text-green-600">有效</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-stone-500">到期时间</p>
                  <p className="text-lg font-semibold text-stone-700">
                    {formatDate(membership.subscriptionExpiresAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-amber-50 rounded-xl text-center">
                  <p className="text-3xl font-bold text-amber-600">
                    {membership.attemptsRemaining}
                  </p>
                  <p className="text-sm text-stone-600">剩余测评次数</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-xl text-center">
                  <p className="text-3xl font-bold text-stone-600">
                    {membership.totalAttempts}
                  </p>
                  <p className="text-sm text-stone-600">年度总次数</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 bg-stone-50 rounded-xl text-center">
                <p className="text-stone-600 mb-2">当前为免费用户</p>
                <p className="text-sm text-stone-500">
                  购买成长陪伴会员，解锁更多测评次数和高级功能
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="font-medium text-amber-800 mb-2">成长陪伴会员权益</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• 12次/年 完整测评（家长+学生+教师）</li>
                  <li>• 趋势对比 - 看见成长的变化</li>
                  <li>• 季度成长摘要 - AI 生成的总结</li>
                  <li>• 高级分享海报 - 带小程序码</li>
                </ul>
                <div className="mt-4 text-center">
                  <button className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600">
                    立即购买 - 199元/年
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 分享奖励 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">邀请奖励</h2>
          <ReferralPanel />
        </div>

        {/* 复测提醒 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">复测提醒</h2>
          <ReminderPanel />
        </div>

        {/* 历史记录入口 */}
        <Link
          href="/history"
          className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              📊
            </div>
            <div>
              <p className="font-medium text-stone-700">测评历史</p>
              <p className="text-sm text-stone-500">查看孩子的成长轨迹</p>
            </div>
          </div>
          <span className="text-stone-400">→</span>
        </Link>
      </main>
    </div>
  );
}
