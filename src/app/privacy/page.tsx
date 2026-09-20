import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '隐私政策',
  description: '学习状态评估隐私政策',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="bg-white/80 backdrop-blur border-b border-stone-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <h1 className="text-lg font-semibold text-stone-800">隐私政策</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 prose prose-stone">
        <p className="text-sm text-stone-400">最后更新日期：2026年9月</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">引言</h2>
          <p className="text-stone-600">
            我们（"内在结构养育"团队，简称"我们"或"荔学卷"）承诺保护您的个人信息和您孩子的测评数据。
            本隐私政策说明了我们如何收集、使用、存储和保护您的信息。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">信息收集</h2>
          <p className="text-stone-600">
            我们收集您主动提供的信息：
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li><strong>账户信息</strong>：手机号码、密码（加密存储）</li>
            <li><strong>孩子信息</strong>：姓名、性别、出生日期、年级</li>
            <li><strong>测评答案</strong>：您和孩子填写的测评问卷内容</li>
            <li><strong>使用数据</strong>：测评历史、报告查看记录</li>
          </ul>
          <p className="text-stone-600 mt-4">
            我们不会收集与测评无关的个人信息，也不会使用收集的信息进行广告推送。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">儿童隐私</h2>
          <p className="text-stone-600">
            我们的服务面向包含小学生在内的各年龄段用户。对于未满18周岁的未成年人：
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li>测评需要家长或监护人授权和参与</li>
            <li>我们仅收集提供服务所必需的最少信息</li>
            <li>家长/监护人有权管理孩子的数据</li>
            <li>我们不会将儿童信息用于商业目的</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">信息使用</h2>
          <p className="text-stone-600">
            您的信息将用于：
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li>生成个性化学习状态分析报告</li>
            <li>提供追踪测评和趋势分析</li>
            <li>发送复测提醒和服务通知</li>
            <li>改进我们的服务质量</li>
          </ul>
          <p className="text-stone-600 mt-4">
            未经您的同意，我们不会将个人信息转让给第三方（法律法规要求除外）。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">信息存储与安全</h2>
          <p className="text-stone-600">
            我们采用行业标准的安全措施保护您的数据：
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li>数据传输采用加密保护（HTTPS）</li>
            <li>密码使用不可逆加密存储</li>
            <li>数据库部署在具有物理和网络安全保障的数据中心</li>
            <li>定期进行安全评估和漏洞修复</li>
          </ul>
          <p className="text-stone-600 mt-4">
            尽管我们尽力保护数据，但互联网传输存在固有风险，我们无法保证100%的安全。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">您的权利</h2>
          <p className="text-stone-600">
            您对您的个人信息享有以下权利：
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li><strong>访问权</strong>：查看我们持有的您的个人信息</li>
            <li><strong>更正权</strong>：要求更正不准确的个人信息</li>
            <li><strong>删除权</strong>：要求删除您的账户和相关信息</li>
            <li><strong>导出权</strong>：导出您的测评历史和报告</li>
          </ul>
          <p className="text-stone-600 mt-4">
            如需行使上述权利，请联系：<a href="mailto:support@nzyy.cc" className="text-amber-600 hover:underline">support@nzyy.cc</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">Cookie 使用</h2>
          <p className="text-stone-600">
            我们使用 Cookie 来维护您的登录状态和偏好设置。Cookie 是存储在您设备上的小型文本文件。
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li><strong>必要 Cookie</strong>：保证服务正常运行</li>
            <li><strong>偏好 Cookie</strong>：记住您的设置和偏好</li>
          </ul>
          <p className="text-stone-600 mt-4">
            您可以通过浏览器设置禁用 Cookie，但这可能会影响部分功能的使用。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">第三方服务</h2>
          <p className="text-stone-600">
            我们可能使用以下第三方服务：
          </p>
          <ul className="list-disc list-inside text-stone-600 mt-2 space-y-1">
            <li>云服务器托管（数据存储）</li>
            <li>错误监控服务（Sentry）</li>
            <li>支付服务（Stripe/Gumroad，如适用）</li>
          </ul>
          <p className="text-stone-600 mt-4">
            这些服务提供商有义务保护您的数据安全。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">政策更新</h2>
          <p className="text-stone-600">
            我们可能会不时更新本隐私政策。如有重大变更，我们将通过服务内通知或邮件通知您。
            继续使用服务即表示您接受更新后的政策。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">联系我们</h2>
          <p className="text-stone-600">
            如对隐私政策有任何疑问或担忧，请联系：
            <a href="mailto:support@nzyy.cc" className="text-amber-600 hover:underline">
              support@nzyy.cc
            </a>
          </p>
          <p className="text-stone-600 mt-2">
            我们将在收到您请求后的15个工作日内回复。
          </p>
        </section>
      </main>
    </div>
  );
}
