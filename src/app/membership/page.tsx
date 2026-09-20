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
  isPending: boolean;
  nzyySource: string | null;
}

interface PointBalance {
  realPoints: number;
  bonusPoints: number;
  bonusPointsUsed: number;
  totalUsable: number;
}

interface Coupon {
  id: string;
  code: string;
  type: 'lixin' | 'shengxue' | 'trial';
  status: string;
  expiresAt: string;
}

const couponTypeNames: Record<string, string> = {
  lixin: '荔心卷',
  shengxue: '升学指数',
  trial: '试用券',
};

const couponTypeCosts: Record<string, number> = {
  lixin: 10,
  shengxue: 15,
};

export default function MembershipPage() {
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [pointBalance, setPointBalance] = useState<PointBalance | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('lzti_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [membershipRes, pointsRes, couponsRes] = await Promise.all([
        fetch('/api/auth/me', { headers }),
        fetch('/api/points/balance', { headers }),
        fetch('/api/coupons', { headers }),
      ]);

      const [membershipJson, pointsJson, couponsJson] = await Promise.all([
        membershipRes.json(),
        pointsRes.json(),
        couponsRes.json(),
      ]);

      if (membershipJson.success) {
        setMembership({
          hasSubscription: false,
          subscriptionStatus: null,
          subscriptionExpiresAt: null,
          bonusAttempts: membershipJson.data.bonusAttempts ?? 0,
          bonusUsed: membershipJson.data.bonusUsed ?? 0,
          bonusRemaining: (membershipJson.data.bonusAttempts ?? 0) - (membershipJson.data.bonusUsed ?? 0),
          totalAttempts: 0,
          attemptsUsed: 0,
          attemptsRemaining: 0,
          isPending: membershipJson.data.isPending ?? false,
          nzyySource: membershipJson.data.nzyySource ?? null,
        });
      }

      if (pointsJson.success) {
        setPointBalance(pointsJson.data);
      }

      if (couponsJson.success) {
        setCoupons(couponsJson.data);
      }
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (type: 'lixin' | 'shengxue') => {
    setRedeeming(type);
    setRedeemError(null);

    try {
      const token = localStorage.getItem('lzti_token');
      const response = await fetch('/api/points/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });

      const json = await response.json();

      if (json.success) {
        await fetchAllData();
        alert(`${couponTypeNames[type]}兑换成功！券码：${json.data.couponCode}`);
      } else {
        setRedeemError(json.error || '兑换失败');
      }
    } catch (err) {
      setRedeemError('兑换失败，请稍后重试');
    } finally {
      setRedeeming(null);
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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeCoupons = coupons.filter((c) => c.status === 'active');

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
        {/* Pending 用户激活引导 */}
        {membership?.isPending && (
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎁</div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 mb-1">待激活账户</h3>
                <p className="text-sm text-amber-700 mb-3">
                  您还没有激活账户，可以购买会员解锁完整功能
                </p>
                <button className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
                  立即激活
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 积分余额卡片 */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">我的积分</h2>
            {loading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          </div>

          {pointBalance && (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{pointBalance.totalUsable}</span>
                <span className="text-amber-100">可用积分</span>
              </div>

              <div className="flex gap-4 text-sm text-amber-100">
                <span>实际积分：{pointBalance.realPoints}</span>
                {pointBalance.bonusPoints > 0 && (
                  <span>奖励积分：{pointBalance.bonusPoints}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 积分兑换 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">积分兑换</h2>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* 荔心卷 */}
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                <div>
                  <p className="font-medium text-amber-800">荔心卷</p>
                  <p className="text-sm text-amber-600">单次完整测评，有效期3个月</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-600">10 积分</p>
                  <button
                    onClick={() => handleRedeem('lixin')}
                    disabled={!pointBalance || pointBalance.totalUsable < 10 || redeeming !== null}
                    className={`mt-1 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                      pointBalance && pointBalance.totalUsable >= 10 && !redeeming
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    {redeeming === 'lixin' ? '兑换中...' : '立即兑换'}
                  </button>
                </div>
              </div>

              {/* 升学指数 */}
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl">
                <div>
                  <p className="font-medium text-orange-800">升学指数</p>
                  <p className="text-sm text-orange-600">含趋势追踪，有效期3个月</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-600">15 积分</p>
                  <button
                    onClick={() => handleRedeem('shengxue')}
                    disabled={!pointBalance || pointBalance.totalUsable < 15 || redeeming !== null}
                    className={`mt-1 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                      pointBalance && pointBalance.totalUsable >= 15 && !redeeming
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    {redeeming === 'shengxue' ? '兑换中...' : '立即兑换'}
                  </button>
                </div>
              </div>

              {redeemError && (
                <p className="text-sm text-red-500">{redeemError}</p>
              )}

              <p className="text-xs text-stone-400">
                积分获取：推荐注册+5积分，推荐测评+3积分
              </p>
            </div>
          )}
        </div>

        {/* 我的券 */}
        {activeCoupons.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">我的券</h2>
            <div className="space-y-3">
              {activeCoupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="flex items-center justify-between p-4 bg-stone-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-stone-700">
                      {couponTypeNames[coupon.type]}
                    </p>
                    <p className="text-sm text-stone-500">
                      有效期至 {formatDateTime(coupon.expiresAt)}
                    </p>
                    <p className="text-xs text-stone-400 font-mono mt-1">{coupon.code}</p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    可使用
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
