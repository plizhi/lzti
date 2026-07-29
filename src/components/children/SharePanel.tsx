'use client';

import { useState, useEffect } from 'react';
import { getAllStages } from '@/data/questionnaires';

interface SharePanelProps {
  childId: string;
  childName: string;
  onClose: () => void;
}

interface ShareResult {
  batchId: string;
  stageId: string;
  questionnaireType: string;
  shareUrl: string;
  slotCount: number;
  expiresAt: string;
}

const questionnaireTypes = [
  { value: 'student', label: '邀请孩子自评' },
  { value: 'teacher', label: '邀请老师参评' },
];

export function SharePanel({ childId, childName, onClose }: SharePanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [copied, setCopied] = useState(false);

  const [stageId, setStageId] = useState('primary-low');
  const [questionnaireType, setQuestionnaireType] = useState('student');

  const stages = getAllStages();

  const handleCreateShare = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/share/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('lzti_token')}`,
        },
        body: JSON.stringify({
          childId,
          stageId,
          questionnaireType,
          slotCount: 1,
          expiresInDays: 2,
        }),
      });

      const json = await response.json();
      if (json.success) {
        setShareResult(json.data);
      } else {
        setError(json.error || '创建分享失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建分享失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareResult) return;
    try {
      await navigator.clipboard.writeText(shareResult.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareResult.shareUrl;
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

  const qrCodeUrl = shareResult
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareResult.shareUrl)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-800">分享测评</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!shareResult ? (
            <>
              {/* 孩子信息 */}
              <div className="mb-6 p-4 bg-amber-50 rounded-xl">
                <p className="font-medium text-stone-800">{childName}的家长</p>
                <p className="text-sm text-stone-600">正在用新的视角了解孩子</p>
              </div>

              {/* 选择学段 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  选择学段
                </label>
                <select
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 选择类型 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  分享类型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {questionnaireTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setQuestionnaireType(type.value)}
                      className={`py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                        questionnaireType === type.value
                          ? 'bg-amber-500 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 提示 */}
              <div className="mb-6 p-4 bg-stone-50 rounded-xl">
                <p className="text-sm text-stone-600">
                  分享链接将在 <span className="font-medium">2天后</span> 过期
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreateShare}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? '生成中...' : '生成分享链接'}
              </button>
            </>
          ) : (
            <div className="space-y-6">
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
                    value={shareResult.shareUrl}
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
                <span className="font-medium text-stone-700">
                  {formatDate(shareResult.expiresAt)}
                </span>
                <span>过期</span>
              </div>

              {/* 类型提示 */}
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-700">
                  {questionnaireType === 'student'
                    ? '邀请孩子扫描二维码参与自评'
                    : '邀请老师扫描二维码参与评价'}
                </p>
              </div>

              <button
                onClick={() => setShareResult(null)}
                className="w-full py-3 rounded-xl border border-stone-300 text-stone-600 font-medium hover:bg-stone-50"
              >
                继续分享
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
