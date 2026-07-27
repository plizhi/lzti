import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 生产环境配置
  output: 'standalone',

  // 启用严格模式
  reactStrictMode: true,

  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // 生产环境构建优化
  swcMinify: true,

  // HTTP/HTTPS 代理配置（如果需要通过港服访问）
  // env: {
  //   NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  // },
};

export default nextConfig;
