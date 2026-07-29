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
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">信息收集</h2>
          <p className="text-stone-600">
            我们收集您主动提供的信息，包括您孩子的基本信息（姓名、年级等）
            以及测评答案。这些信息仅用于提供个性化的学习状态分析服务。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">信息使用</h2>
          <p className="text-stone-600">
            您的信息将用于：生成学习状态报告、提供个性化建议、支持追踪功能。
            我们不会将您的个人信息用于广告推送或转让给第三方。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">信息保护</h2>
          <p className="text-stone-600">
            我们采用行业标准的安全措施保护您的数据，包括数据加密、
            访问控制和定期安全审计。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">Cookie 使用</h2>
          <p className="text-stone-600">
            我们使用 Cookie 来维护您的登录状态和偏好设置。您可以通过浏览器设置禁用 Cookie，
            但这可能会影响部分功能的使用。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">儿童隐私</h2>
          <p className="text-stone-600">
            我们的服务主要面向家长，用户需要年满18周岁。我们不会故意收集未满14周岁儿童的个人信息。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-4">联系我们</h2>
          <p className="text-stone-600">
            如对隐私政策有任何疑问，请联系：
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
