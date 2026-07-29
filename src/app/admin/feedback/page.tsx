'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/api/client';

interface Feedback {
  id: string;
  content: string;
  category: string;
  status: string;
  contact: string | null;
  autoReply: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  suggestion: { label: '建议', color: 'bg-blue-100 text-blue-700' },
  bug: { label: 'Bug', color: 'bg-red-100 text-red-700' },
  complaint: { label: '投诉', color: 'bg-orange-100 text-orange-700' },
  inquiry: { label: '咨询', color: 'bg-stone-100 text-stone-700' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-amber-100 text-amber-700' },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: '已解决', color: 'bg-green-100 text-green-700' },
};

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [replyText, setReplyText] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/admin/feedback?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('lzti_token')}`,
        },
      });
      const json = await response.json();

      if (json.success) {
        setFeedbacks(json.data.feedbacks);
        setTotalPages(json.data.totalPages);
      } else {
        setError(json.error || '获取数据失败');
      }
    } catch {
      setError('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [page, statusFilter]);

  const handleUpdateStatus = async (id: string, status: string, reply?: string) => {
    setUpdating(true);
    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('lzti_token')}`,
        },
        body: JSON.stringify({ id, status, reply }),
      });
      const json = await response.json();

      if (json.success) {
        fetchFeedbacks();
        setSelectedFeedback(null);
        setReplyText('');
      } else {
        alert(json.error || '更新失败');
      }
    } catch {
      alert('更新失败');
    } finally {
      setUpdating(false);
    }
  };

  const openReplyModal = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setReplyText(feedback.reply || '');
  };

  if (loading && feedbacks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="text-stone-500 hover:text-stone-700">
              ← 返回
            </Link>
            <h1 className="text-lg font-semibold text-stone-800">反馈管理</h1>
            <div />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* 筛选 */}
        <div className="flex gap-2 mb-6">
          {['', 'pending', 'processing', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              {status === '' ? '全部' : statusLabels[status]?.label}
            </button>
          ))}
        </div>

        {/* 列表 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">类型</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">内容</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">联系方式</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">状态</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">时间</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-stone-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f) => (
                <tr key={f.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryLabels[f.category]?.color || 'bg-stone-100 text-stone-600'}`}>
                      {categoryLabels[f.category]?.label || f.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-stone-700 line-clamp-2 max-w-md">{f.content}</p>
                    {f.autoReply && (
                      <p className="text-xs text-stone-400 mt-1">自动回复：{f.autoReply}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-600">
                    {f.contact || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabels[f.status]?.color || 'bg-stone-100 text-stone-600'}`}>
                      {statusLabels[f.status]?.label || f.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-500">
                    {new Date(f.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openReplyModal(f)}
                      className="text-sm text-amber-600 hover:text-amber-800 font-medium"
                    >
                      {f.reply ? '查看回复' : '回复'}
                    </button>
                  </td>
                </tr>
              ))}
              {feedbacks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-400">
                    暂无反馈数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white text-stone-600 disabled:opacity-50 hover:bg-stone-50"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-stone-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-white text-stone-600 disabled:opacity-50 hover:bg-stone-50"
            >
              下一页
            </button>
          </div>
        )}
      </main>

      {/* 回复弹窗 */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-stone-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-stone-800">处理反馈</h3>
                <button
                  onClick={() => { setSelectedFeedback(null); setReplyText(''); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <p className="text-sm text-stone-500 mb-1">反馈内容</p>
                <p className="text-stone-700">{selectedFeedback.content}</p>
              </div>

              {selectedFeedback.contact && (
                <div>
                  <p className="text-sm text-stone-500 mb-1">联系方式</p>
                  <p className="text-stone-700">{selectedFeedback.contact}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-stone-500 mb-1">状态</p>
                <div className="flex gap-2">
                  {Object.entries(statusLabels).map(([key, { label, color }]) => (
                    <button
                      key={key}
                      onClick={() => handleUpdateStatus(selectedFeedback.id, key, replyText)}
                      disabled={updating}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${color} ${
                        selectedFeedback.status === key ? 'ring-2 ring-offset-1 ring-amber-400' : ''
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-stone-500 mb-1">回复内容</p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="输入回复内容..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-500 outline-none resize-none"
                />
              </div>

              {selectedFeedback.reply && (
                <div>
                  <p className="text-sm text-stone-500 mb-1">已回复</p>
                  <p className="text-stone-700">{selectedFeedback.reply}</p>
                  <p className="text-xs text-stone-400 mt-1">
                    {selectedFeedback.repliedAt && new Date(selectedFeedback.repliedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-stone-200">
              <button
                onClick={() => handleUpdateStatus(selectedFeedback.id, selectedFeedback.status, replyText)}
                disabled={updating || !replyText.trim()}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? '保存中...' : '保存回复'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
