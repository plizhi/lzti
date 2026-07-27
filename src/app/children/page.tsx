'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { children as childrenApi, auth } from '@/lib/api/client';
import { SharePanel } from '@/components/children/SharePanel';

interface Child {
  id: string;
  name: string;
  gender: string | null;
  birthDate: string | null;
  grade: string | null;
  sessions: Array<{
    id: string;
    stageId: string;
    completed: string;
    createdAt: string;
  }>;
}

export default function ChildrenPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildGrade, setNewChildGrade] = useState('');
  const [error, setError] = useState('');
  const [sharingChild, setSharingChild] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const data = await auth.me();
      setChildren(data.children);
    } catch (err) {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await childrenApi.create({ name: newChildName, grade: newChildGrade });
      setNewChildName('');
      setNewChildGrade('');
      setShowAddForm(false);
      loadChildren();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    }
  };

  const handleDeleteChild = async (id: string) => {
    if (!confirm('确定要删除吗？')) return;
    try {
      await childrenApi.delete(id);
      loadChildren();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-stone-500 hover:text-stone-700">
              ← 返回
            </Link>
            <h1 className="text-lg font-semibold text-stone-800">孩子管理</h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-amber-600 hover:text-amber-700"
            >
              + 添加
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {loading ? (
          <div className="text-center py-12 text-stone-500">加载中...</div>
        ) : children.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👶</div>
            <p className="text-stone-600">还没有添加孩子</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 px-6 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
            >
              添加孩子
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child) => (
              <div
                key={child.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-stone-800">{child.name}</h3>
                    <p className="text-sm text-stone-500 mt-1">
                      {child.grade || '未设置年级'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSharingChild({ id: child.id, name: child.name })}
                      className="text-amber-600 hover:text-amber-700 text-sm"
                    >
                      分享
                    </button>
                    <button
                      onClick={() => handleDeleteChild(child.id)}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {child.sessions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <p className="text-sm text-stone-500 mb-2">
                      已完成 {child.sessions.length} 次测评
                    </p>
                    <div className="flex gap-2">
                      {child.sessions.slice(0, 3).map((session) => (
                        <span
                          key={session.id}
                          className="px-2 py-1 rounded bg-stone-100 text-xs text-stone-600"
                        >
                          {session.stageId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold text-stone-800 mb-4">
                添加孩子
              </h3>
              <form onSubmit={handleAddChild} className="space-y-4">
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
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-2 rounded-xl border border-stone-300 text-stone-600"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-amber-500 text-white"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {sharingChild && (
          <SharePanel
            childId={sharingChild.id}
            childName={sharingChild.name}
            onClose={() => setSharingChild(null)}
          />
        )}
      </main>
    </div>
  );
}
