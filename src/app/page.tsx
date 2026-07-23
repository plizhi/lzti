import Link from 'next/link';
import { getAllStages } from '@/data/questionnaires';

export default function Home() {
  const stages = getAllStages();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="px-6 py-8 text-center">
        <h1 className="text-2xl font-bold text-stone-800">学习状态评估</h1>
        <p className="mt-2 text-stone-500">选择孩子的学段开始测评</p>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-12">
        <div className="grid gap-4 sm:grid-cols-2">
          {stages.map((stage) => (
            <Link
              key={stage.id}
              href={`/assessment/${stage.id}`}
              className="group block rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-stone-800 group-hover:text-amber-600">
                    {stage.name}
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">{stage.gradeRange}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                  {stage.dimensionCount}维度
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-600">{stage.description}</p>
              <p className="mt-3 text-xs text-amber-600">
                核心能力：{stage.coreAbility}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex gap-4">
          <Link
            href="/history"
            className="flex-1 rounded-xl border border-stone-300 bg-white py-4 text-center font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            📋 查看历史记录
          </Link>
        </div>

        <div className="mt-8 rounded-xl bg-stone-100 p-4">
          <h3 className="font-medium text-stone-700">关于测评</h3>
          <p className="mt-2 text-sm text-stone-600">
            本测评基于「内在结构养育理论」，从多个维度评估孩子的学习状态。
            完成测评后，您将获得个性化的分析报告和引导建议。
          </p>
        </div>
      </main>
    </div>
  );
}
