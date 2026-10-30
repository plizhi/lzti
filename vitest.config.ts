import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      // 运维脚本借 vitest 的 TS 编译与路径别名来跑，但它需要真实数据库连接，
      // 不属于常规单测，默认不纳入。显式开启才跑：
      //   BACKFILL_APPLY=1 BACKFILL_INCLUDE_SCRIPTS=1 npx vitest run
      ...(process.env.BACKFILL_INCLUDE_SCRIPTS === '1'
        ? ['scripts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
        : []),
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
