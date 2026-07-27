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
};

export default nextConfig;
