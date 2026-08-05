'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lzti_token');
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || '请求失败');
  }
  return json.data as T;
}

interface Batch {
  id: string;
  stageId: string;
  questionnaireType: string;
  createdAt: string;
  expiresAt: string;
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
}

interface Slot {
  id: string;
  code: string;
  type: string;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string;
  childId: string | null;
  batchId: string;
  stageId: string;
  batchType: string;
  batchUserId: string;
}

interface UserCode {
  id: string;
  code: string;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
  userId: string;
  userPhone: string | null;
  userStatus: string | null;
}

interface CreateForm {
  userId: string;
  stageId: string;
  questionnaireType: 'register' | 'student' | 'teacher';
  slotCount: number;
  expiresInDays: number;
}

const STAGES = [
  { value: 'primary-low', label: '小学低年级（1-2年级）' },
  { value: 'primary-high', label: '小学高年级（3-4年级）' },
  { value: 'junior', label: '初中（5-7年级）' },
  { value: 'junior-high', label: '初三' },
  { value: 'senior', label: '高一高二' },
  { value: 'senior-high', label: '高三' },
];

const QUESTIONNAIRE_TYPES = [
  { value: 'register', label: '邀请注册' },
  { value: 'student', label: '邀请孩子自评' },
  { value: 'teacher', label: '邀请老师参评' },
];

export default function InvitationCodesPage() {
  const [activeTab, setActiveTab] = useState<'batches' | 'slots' | 'user-codes'>('batches');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [userCodes, setUserCodes] = useState<UserCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    userId: '',
    stageId: 'primary-low',
    questionnaireType: 'register',
    slotCount: 10,
    expiresInDays: 2,
  });
  const [createResult, setCreateResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab, page]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<any>(`/admin/invitation-codes?type=${activeTab}&page=${page}&limit=20`);
      if (activeTab === 'batches') {
        setBatches(response.batches);
      } else if (activeTab === 'slots') {
        setSlots(response.slots);
      } else {
        setUserCodes(response.codes);
      }
      setTotalPages(response.totalPages);
    } catch {
      setError('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const response = await apiRequest<any>('/admin/invitation-codes', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setCreateResult(response);
      fetchData();
    } catch {
      setError('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="text-stone-500 hover:text-stone-700">
              ← 返回
            </Link>
            <h1 className="text-lg font-semibold text-stone-800">邀请码管理</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
            >
              创建批次
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex gap-2 mb-6">
          {(['batches', 'slots', 'user-codes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              {tab === 'batches' ? '分享批次' : tab === 'slots' ? '邀请码' : '用户邀请码'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>
        ) : (
          <>
            {activeTab === 'batches' && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">学段</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">类型</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">总码数</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">已用</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">可用</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">过期时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-stone-50">
                        <td className="px-6 py-4 text-sm text-stone-800">
                          {STAGES.find((s) => s.value === batch.stageId)?.label || batch.stageId}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {QUESTIONNAIRE_TYPES.find((t) => t.value === batch.questionnaireType)?.label || batch.questionnaireType}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-800">{batch.totalSlots}</td>
                        <td className="px-6 py-4 text-sm text-stone-600">{batch.usedSlots}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`text-sm font-medium ${batch.availableSlots > 0 ? 'text-green-600' : 'text-stone-400'}`}>
                            {batch.availableSlots}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {new Date(batch.expiresAt) < new Date() ? (
                            <span className="text-red-500">已过期</span>
                          ) : (
                            new Date(batch.expiresAt).toLocaleDateString('zh-CN')
                          )}
                        </td>
                      </tr>
                    ))}
                    {batches.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-stone-400">暂无数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'slots' && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">邀请码</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">类型</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">学段</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">状态</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">过期时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {slots.map((slot) => (
                      <tr key={slot.id} className="hover:bg-stone-50">
                        <td className="px-6 py-4 text-sm font-mono text-stone-800">
                          <button
                            onClick={() => copyToClipboard(slot.code)}
                            className="hover:text-amber-600"
                            title="点击复制"
                          >
                            {slot.code}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {QUESTIONNAIRE_TYPES.find((t) => t.value === slot.type)?.label || slot.type}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {STAGES.find((s) => s.value === slot.stageId)?.label || slot.stageId}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {slot.usedBy ? (
                            <span className="text-green-600">已使用</span>
                          ) : new Date(slot.expiresAt) < new Date() ? (
                            <span className="text-red-500">已过期</span>
                          ) : (
                            <span className="text-amber-600">可用</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {new Date(slot.expiresAt).toLocaleDateString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                    {slots.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-stone-400">暂无数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'user-codes' && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">邀请码</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">拥有者</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">使用者</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">使用时间</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">创建时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {userCodes.map((code) => (
                      <tr key={code.id} className="hover:bg-stone-50">
                        <td className="px-6 py-4 text-sm font-mono text-stone-800">
                          <button
                            onClick={() => copyToClipboard(code.code)}
                            className="hover:text-amber-600"
                            title="点击复制"
                          >
                            {code.code}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {code.userPhone || code.userId.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {code.usedBy ? (
                            <span className="text-green-600">{code.usedBy.slice(0, 8)}</span>
                          ) : (
                            <span className="text-stone-400">未使用</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {code.usedAt ? new Date(code.usedAt).toLocaleDateString('zh-CN') : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-600">
                          {new Date(code.createdAt).toLocaleDateString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                    {userCodes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-stone-400">暂无数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-white text-stone-600 disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="px-4 py-2 text-stone-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg bg-white text-stone-600 disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">创建分享批次</h2>

            {createResult ? (
              <div>
                <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-4">
                  创建成功！
                </div>
                <div className="bg-stone-50 p-4 rounded-xl mb-4">
                  <div className="text-sm text-stone-600 mb-2">生成的邀请码：</div>
                  <div className="space-y-1">
                    {createResult.slots?.map((slot: any) => (
                      <div key={slot.id} className="font-mono text-sm text-stone-800">
                        {slot.code}
                        <button
                          onClick={() => copyToClipboard(slot.code)}
                          className="ml-2 text-amber-600 hover:underline text-xs"
                        >
                          复制
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { setShowCreateModal(false); setCreateResult(null); }}
                  className="w-full py-2 bg-amber-500 text-white rounded-lg font-medium"
                >
                  关闭
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">用户ID</label>
                  <input
                    type="text"
                    value={createForm.userId}
                    onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                    placeholder="输入用户ID"
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">学段</label>
                  <select
                    value={createForm.stageId}
                    onChange={(e) => setCreateForm({ ...createForm, stageId: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {STAGES.map((stage) => (
                      <option key={stage.value} value={stage.value}>{stage.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">类型</label>
                  <select
                    value={createForm.questionnaireType}
                    onChange={(e) => setCreateForm({ ...createForm, questionnaireType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {QUESTIONNAIRE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">邀请码数量</label>
                    <input
                      type="number"
                      value={createForm.slotCount}
                      onChange={(e) => setCreateForm({ ...createForm, slotCount: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={100}
                      className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">有效期（天）</label>
                    <input
                      type="number"
                      value={createForm.expiresInDays}
                      onChange={(e) => setCreateForm({ ...createForm, expiresInDays: parseInt(e.target.value) || 1 })}
                      min={1}
                      max={30}
                      className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2 border border-stone-200 rounded-lg text-stone-600"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !createForm.userId}
                    className="flex-1 py-2 bg-amber-500 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {creating ? '创建中...' : '创建'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
