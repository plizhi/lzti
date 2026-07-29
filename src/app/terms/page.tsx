import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '服务条款',
  description: '学习状态评估服务条款',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <h1 className="text-lg font-semibold text-stone-800">服务条款</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 prose prose-stone">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">服务说明</h2>
          <p className="text-stone-600">
            学习状态评估是一项基于「内在结构养育理论」的教育评估服务。我们提供学习状态的
            多维度分析和建议，旨在帮助家长更好地了解和支持孩子的成长。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">使用规范</h2>
          <p className="text-stone-600">
            您同意：
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li>使用我们的服务进行正当的教育目的</li>
            <li>不会将服务用于任何非法或未经授权的目的</li>
            <li>不会尝试未经授权访问其他用户的账户或数据</li>
            <li>不会干扰或破坏服务的正常运行</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">免责声明</h2>
          <p className="text-stone-600">
            本服务提供的评估结果和建议仅供参考，不构成医学、心理或教育诊断。
            我们不对因使用本服务而产生的任何直接或间接损失负责。请家长结合实际情况
            和专业意见做出教育决策。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">订阅与退款</h2>
          <p className="text-stone-600">
            订阅服务按季度计费，有效期内可无限次使用。退款政策如下：
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li>服务开通后7天内，如对服务不满意，可申请全额退款</li>
            <li>超过7天，不支持退款，但服务将继续有效至订阅到期</li>
            <li>特殊情况下可酌情处理</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">知识产权</h2>
          <p className="text-stone-600">
            本服务的内容、设计、代码和商标归我们所有，未经授权不得复制或使用。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">服务变更</h2>
          <p className="text-stone-600">
            我们保留随时修改或停止服务的权利。如有重大变更，我们将提前通知用户。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">联系我们</h2>
          <p className="text-stone-600">
            如对服务条款有任何疑问，请联系：
            <a href="mailto:support@nzyy.cc" className="text-amber-600 hover:underline">
              support@nzyy.cc
            </a>
          </p>
        </section>

        <p className="text-xs text-stone-400 mt-12">
          最后更新日期：2026年7月
        </p>
      </main>
    </div>
  );
}
