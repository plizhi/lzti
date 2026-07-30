'use client';

import { useState, useEffect, useCallback } from 'react';
import { assessment } from '@/lib/api/client';

interface ShareReportModalProps {
  attemptId: string;
  onClose: () => void;
  isMember?: boolean;
}

interface ShareData {
  shareId: string;
  shareCode: string;
  shareUrl: string;
  expiresAt: string;
  isExisting: boolean;
  childName?: string;
  stageName?: string;
  quadrantLabels?: string[];
  assessedAt?: string;
}

export function ShareReportModal({ attemptId, onClose, isMember = false }: ShareReportModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchShare = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/share/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('lzti_token')}`,
        },
        body: JSON.stringify({ attemptId, expiresInDays: 7 }),
      });
      const json = await response.json();
      if (json.success) {
        setShareData(json.data);
      } else {
        setError(json.error || '创建分享失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建分享失败');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    fetchShare();
  }, [fetchShare]);

  const handleCopy = async () => {
    if (!shareData) return;
    const fullUrl = `${window.location.origin}${shareData.shareUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 复制失败，尝试选中文字
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const fullUrl = shareData ? `${window.location.origin}${shareData.shareUrl}` : '';
  const qrCodeUrl = fullUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullUrl)}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-800">分享报告</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchShare}
                className="text-amber-600 hover:text-amber-700"
              >
                重试
              </button>
            </div>
          ) : shareData ? (
            <div className="space-y-6">
              {/* 报告信息头部 */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {shareData.childName && (
                    <span className="text-lg font-semibold text-stone-800">
                      {shareData.childName}
                    </span>
                  )}
                  {isMember && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                      会员
                    </span>
                  )}
                </div>
                {shareData.stageName && (
                  <p className="text-sm text-stone-500">{shareData.stageName}</p>
                )}
                {shareData.quadrantLabels && shareData.quadrantLabels.length > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-2 flex-wrap">
                    {shareData.quadrantLabels.map((label, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                {shareData.assessedAt && (
                  <p className="text-xs text-stone-400 mt-2">
                    测评时间：{formatDate(shareData.assessedAt)}
                  </p>
                )}
              </div>

              {/* 二维码 */}
              <div className="flex justify-center">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="分享二维码"
                    className="w-36 h-36"
                  />
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
                    value={fullUrl}
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

              {/* 过期时间 */}
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <span>链接将在</span>
                <span className="font-medium text-stone-700">{formatDate(shareData.expiresAt)}</span>
                <span>过期</span>
              </div>

              {/* 提示 */}
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-700">
                  接收方无需登录即可查看此报告的只读版本
                </p>
              </div>

              {/* 身份认同 */}
              <p className="text-xs text-stone-400 text-center">
                分享让关心变得更具体
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
