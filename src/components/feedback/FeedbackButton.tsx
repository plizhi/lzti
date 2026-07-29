'use client';

import { useState } from 'react';

interface FeedbackButtonProps {
  className?: string;
}

export function FeedbackButton({ className = '' }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('lzti_token');
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content, contact }),
      });

      const json = await response.json();
      if (json.success) {
        setSubmitted(true);
        setTimeout(() => {
          setOpen(false);
          setSubmitted(false);
          setContent('');
          setContact('');
        }, 2000);
      } else {
        setError(json.error || '提交失败，请重试');
      }
    } catch {
      setError('网络错误，请检查网络连接');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`text-stone-400 hover:text-amber-600 text-sm transition-colors ${className}`}
      >
        意见反馈
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-800">意见反馈</h3>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-amber-600 mb-2">感谢您的反馈！</p>
            <p className="text-sm text-stone-500">我们将尽快处理</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                您的问题或建议
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请详细描述您的问题或建议..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-500 outline-none resize-none"
                required
              />
              <p className="text-xs text-stone-400 mt-1">
                至少5个字
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                联系方式（选填）
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="手机号或邮箱"
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || content.trim().length < 5}
              className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '提交中...' : '提交反馈'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
