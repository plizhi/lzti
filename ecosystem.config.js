// 同一份配置服务生产和开发两个实例，用 APP_TARGET 区分：
//   生产：pm2 start ecosystem.config.js                 → lzti     :3000 (cluster)
//   开发：APP_TARGET=dev pm2 start ecosystem.config.js  → lzti-dev :3010 (fork)
const dev = process.env.APP_TARGET === 'dev';

module.exports = {
  apps: [
    {
      name: dev ? 'lzti-dev' : 'lzti',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: __dirname,
      instances: 1,
      exec_mode: dev ? 'fork' : 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 3000,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: dev ? 3010 : 3000,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
    },
  ],
};
