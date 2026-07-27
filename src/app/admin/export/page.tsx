'use client';

import { useState } from 'react';
import Link from 'next/link';

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (type: 'users' | 'assessments') => {
    setExporting(type);

    try {
      const response = await fetch(`/api/admin/export/${type}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('lzti_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || '导出失败');
      }

      const data = json.data[type] || [];
      const csv = convertToCSV(data);
      downloadFile(csv, `${type}.csv`, 'text/csv');
    } catch (err) {
      alert(err instanceof Error ? err.message : '导出失败');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="text-stone-500 hover:text-stone-700">
              ← 返回
            </Link>
            <h1 className="text-lg font-semibold text-stone-800">数据导出</h1>
            <div />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-8">
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">用户数据</h2>
          <p className="text-sm text-stone-500 mb-4">
            导出所有用户信息，包括手机号、状态、角色、创建时间等
          </p>
          <button
            onClick={() => handleExport('users')}
            disabled={exporting !== null}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
          >
            {exporting === 'users' ? '导出中...' : '导出为 CSV'}
          </button>
        </section>

        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">测评记录</h2>
          <p className="text-sm text-stone-500 mb-4">
            导出现在数据库中的测评记录，最多 1000 条
          </p>
          <button
            onClick={() => handleExport('assessments')}
            disabled={exporting !== null}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {exporting === 'assessments' ? '导出中...' : '导出为 CSV'}
          </button>
        </section>

        <div className="text-center text-sm text-stone-400">
          导出文件为 CSV 格式，可用 Excel 打开
        </div>
      </main>
    </div>
  );
}
