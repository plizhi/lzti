'use client';

import { useState, useEffect } from 'react';

interface ShareStats {
  shareCode: string;
  shareUrl: string;
  stats: {
    totalShared: number;
    validReferrals: number;
    totalReferrals: number;
    bonusEarned: number;
    bonusUsed: number;
    bonusRemaining: number;
  };
  recentReferrals: Array<{
    id: string;
    referredAt: string;
    registered: boolean;
    assessed: boolean;
    subscribed: boolean;
    rewardsEarned: number;
  }>;
}

export function ReferralPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchShareStats();
  }, []);

  const fetchShareStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/share/code', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('lzti_token')}`,
        },
      });
      const json = await response.json();
      if (json.success) {
        setStats(json.data);
      } else {
        setError(json.error || '获取分享信息失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取分享信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!stats) return;
    try {
      await navigator.clipboard.writeText(stats.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = stats.shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async (type: 'link' | 'poster' | 'qrcode') => {
    if (!stats) return;
    try {
      await fetch('/api/share/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('lzti_token')}`,
        },
        body: JSON.stringify({ type }),
      });
    } catch {
      // 静默失败，不影响用户体验
    }
  };

  const qrCodeUrl = stats
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(stats.shareUrl)}`
    : '';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 rounded-xl bg-red-50 text-red-600 text-center">
        {error || '获取分享信息失败'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 分享码 */}
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
        <p className="text-sm text-stone-600 mb-1">我的分享码</p>
        <p className="text-2xl font-bold text-amber-600 tracking-wider">{stats.shareCode}</p>
      </div>

      {/* 二维码 */}
      <div className="flex justify-center">
        <div className="p-3 bg-white rounded-xl shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeUrl} alt="分享二维码" className="w-36 h-36" />
        </div>
      </div>

      {/* 分享链接 */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          分享链接
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={stats.shareUrl}
            readOnly
            className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm bg-stone-50"
          />
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white rounded-xl text-center border border-stone-200">
          <p className="text-2xl font-bold text-amber-600">{stats.stats.bonusRemaining}</p>
          <p className="text-xs text-stone-500">剩余奖励</p>
        </div>
        <div className="p-3 bg-white rounded-xl text-center border border-stone-200">
          <p className="text-2xl font-bold text-stone-600">{stats.stats.validReferrals}</p>
          <p className="text-xs text-stone-500">有效邀请</p>
        </div>
        <div className="p-3 bg-white rounded-xl text-center border border-stone-200">
          <p className="text-2xl font-bold text-stone-600">{stats.stats.totalShared}</p>
          <p className="text-xs text-stone-500">分享次数</p>
        </div>
      </div>

      {/* 奖励说明 */}
      <div className="p-4 bg-stone-50 rounded-xl">
        <p className="text-sm font-medium text-stone-700 mb-2">邀请奖励</p>
        <ul className="text-sm text-stone-600 space-y-1">
          <li>• 被分享者注册成功：<span className="text-amber-600 font-medium">+1次</span></li>
          <li>• 被分享者完成测评：<span className="text-amber-600 font-medium">+1次</span></li>
          <li>• 被分享者付费订阅：<span className="text-amber-600 font-medium">+3次</span></li>
        </ul>
      </div>

      {/* 最近邀请 */}
      {stats.recentReferrals.length > 0 && (
        <div>
          <p className="text-sm font-medium text-stone-700 mb-3">最近邀请</p>
          <div className="space-y-2">
            {stats.recentReferrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm">
                    {referral.registered ? '✓' : '○'}
                  </div>
                  <div>
                    <p className="text-sm text-stone-700">
                      {referral.registered ? '已注册' : '待注册'}
                    </p>
                    <p className="text-xs text-stone-400">{formatDate(referral.referredAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {referral.assessed && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                      已测评
                    </span>
                  )}
                  {referral.subscribed && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                      已付费
                    </span>
                  )}
                  <span className="text-amber-600 text-sm font-medium">
                    +{referral.rewardsEarned}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
