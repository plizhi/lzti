import Link from 'next/link';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

const contactEmail = 'support@nzyy.cc';

export function Footer() {
  return (
    <footer className="bg-stone-100 border-t border-stone-200 mt-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-stone-500">
            <a
              href={`mailto:${contactEmail}`}
              className="hover:text-amber-600 transition-colors"
            >
              {contactEmail}
            </a>
            <span>|</span>
            <FeedbackButton />
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-stone-400">
            <Link
              href="/privacy"
              className="hover:text-amber-600 transition-colors"
            >
              隐私政策
            </Link>
            <span>|</span>
            <Link
              href="/terms"
              className="hover:text-amber-600 transition-colors"
            >
              服务条款
            </Link>
          </div>

          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} 学习状态评估 · 基于内在结构养育理论
          </p>
        </div>
      </div>
    </footer>
  );
}
