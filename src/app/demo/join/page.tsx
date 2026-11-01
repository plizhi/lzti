import type { Metadata } from 'next';
import { Suspense } from 'react';
import DemoJoinClient from './DemoJoinClient';

export const metadata: Metadata = {
  title: '加入测评 | 荔学卷',
  description: '扫码加入这一场学习状态测评，用手机就能作答',
  // 演示落地页不该被搜索引擎收录
  robots: { index: false, follow: false },
};

function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      <p className="mt-4 text-stone-500 text-sm">正在打开测评…</p>
    </div>
  );
}

export default function DemoJoinPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DemoJoinClient />
    </Suspense>
  );
}
