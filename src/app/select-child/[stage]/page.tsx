'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { auth, assessment } from '@/lib/api/client';
import { getStage } from '@/data/questionnaires';

interface Child {
  id: string;
  name: string;
  grade: string | null;
}

export default function SelectChildPage() {
  const router = useRouter();
  const params = useParams();
  const stageId = params.stage as string;
  const stage = getStage(stageId as any);

  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildGrade, setNewChildGrade] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const data = await auth.me();
      setChildren(data.children);
      if (data.children.length === 0) {
        setShowCreateForm(true);
      }
    } catch {
      setError('加载失败，请先登录');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChild = async (childId: string) => {
    setCreating(true);
    try {
      const session = await assessment.createSession({
        childId,
        stageId,
      });
      router.push(`/assessment/${stageId}?sessionId=${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建会话失败');
      setCreating(false);
    }
  };

  const handleCreateAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { children: childrenApi } = await import('@/lib/api/client');
      const newChild = await childrenApi.create({
        name: newChildName,
        grade: newChildGrade,
      });
      const session = await assessment.createSession({
        childId: newChild.id,
        stageId,
      });
      router.push(`/assessment/${stageId}?sessionId=${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <p className="text-stone-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <Link
            href="/"
            className="text-stone-500 hover:text-stone-700"
          >
            ← 返回
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-xl font-bold text-stone-800 mb-2">
          选择测评孩子
        </h1>
        <p className="text-stone-500 mb-6">
          {stage?.name} · {stage?.gradeRange}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {children.length > 0 && !showCreateForm && (
          <div className="space-y-3">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => handleSelectChild(child.id)}
                disabled={creating}
                className="w-full text-left rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-stone-800">{child.name}</h3>
                    <p className="text-sm text-stone-500 mt-1">
                      {child.grade || '未设置年级'}
                    </p>
                  </div>
                  <span className="text-amber-500">开始测评 →</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {children.length > 0 && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-stone-300 text-stone-500 hover:border-amber-400 hover:text-amber-600 transition"
          >
            + 添加新孩子
          </button>
        )}

        {showCreateForm && (
          <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-stone-800 mb-4">添加孩子</h3>
            <form onSubmit={handleCreateAndStart} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  姓名
                </label>
                <input
                  type="text"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  年级
                </label>
                <select
                  value={newChildGrade}
                  onChange={(e) => setNewChildGrade(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none"
                  required
                >
                  <option value="">请选择</option>
                  <option value="一年级">一年级</option>
                  <option value="二年级">二年级</option>
                  <option value="三年级">三年级</option>
                  <option value="四年级">四年级</option>
                  <option value="五年级">五年级</option>
                  <option value="六年级">六年级</option>
                  <option value="初一">初一</option>
                  <option value="初二">初二</option>
                  <option value="初三">初三</option>
                  <option value="高一">高一</option>
                  <option value="高二">高二</option>
                  <option value="高三">高三</option>
                </select>
              </div>
              <div className="flex gap-2">
                {children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-2 rounded-xl border border-stone-300 text-stone-600"
                  >
                    取消
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-white"
                >
                  添加并开始
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
