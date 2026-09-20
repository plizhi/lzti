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
        <p className="text-sm text-stone-400">最后更新日期：2026年9月</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">服务说明</h2>
          <p className="text-stone-600">
            荔学卷是一项基于「内在结构养育理论」的教育评估服务。我们提供学习状态的
            多维度分析和建议，旨在帮助家长更好地了解和支持孩子的成长。
          </p>
          <p className="text-stone-600 mt-2">
            本服务由"内在结构养育"团队提供，创始人为朋大大与杨莉老师。
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
            <li>账户仅供本人使用，不得转让或共享</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">账户责任</h2>
          <ul className="list-disc list-inside text-stone-600 space-y-1">
            <li>您有责任保管好自己的账户凭证和密码</li>
            <li>账户下所有活动由账户持有人负责</li>
            <li>如发现账户被盗用，请立即联系我们</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">测评服务</h2>
          <p className="text-stone-600">
            测评服务包含以下内容：
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li>学习状态多维度评估（学生自评、家长观察、教师评价）</li>
            <li>个性化分析报告</li>
            <li>追踪测评与趋势分析</li>
            <li>定期复测提醒</li>
          </ul>
          <p className="text-stone-600 mt-4">
            测评结果仅供参考，不构成医学、心理或教育诊断。我们不对因使用本服务而产生的任何直接或间接损失负责。请家长结合实际情况和专业意见做出教育决策。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">订阅与退款</h2>
          <p className="text-stone-600">
            订阅服务按周期计费，有效期内可按照套餐内容使用。退款政策如下：
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li>订阅服务开通后72小时内，如对服务不满意，可申请全额退款</li>
            <li>因系统原因导致服务无法正常使用的情况，可申请退款</li>
            <li>特殊情况可酌情处理</li>
          </ul>
          <p className="text-stone-600 mt-4">
            退款申请请联系：<a href="mailto:support@nzyy.cc" className="text-amber-600 hover:underline">support@nzyy.cc</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">数据保护</h2>
          <p className="text-stone-600">
            我们重视您的数据安全：
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li>数据传输采用加密保护</li>
            <li>数据存储采用行业标准安全措施</li>
            <li>定期进行安全审计和更新</li>
            <li>严格限制数据访问权限</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">知识产权</h2>
          <p className="text-stone-600">
            本服务的内容、设计、代码、测评体系和商标归我们所有，未经授权不得复制、使用或传播。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">服务变更</h2>
          <p className="text-stone-600">
            我们保留随时修改服务条款或停止服务的权利。如有重大变更，我们将通过合理方式通知用户。
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
      </main>
    </div>
  );
}
