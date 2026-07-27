import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // 环境
  environment: process.env.NODE_ENV,

  // 是否启用
  enabled: !!process.env.SENTRY_DSN,

  // 采样率
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 调试模式
  debug: process.env.NODE_ENV !== 'production',
});
