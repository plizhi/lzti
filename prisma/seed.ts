import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Prisma 7 必须挂 driver adapter 才能连库（跟 src/lib/db/client.ts 一致）
const pool = new pg.Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log('开始初始化...');

  // 创建一个测试用户（方便开发）
  const testUser = await prisma.user.upsert({
    where: { phone: '13800138000' },
    update: {},
    create: {
      phone: '13800138000',
      passwordHash: '$2b$10$placeholder', // 临时占位
      status: 'ACTIVE',
      name: '测试用户',
    },
  });

  console.log('创建测试用户:', testUser.phone);

  // 演示账号（demo 账号 + 六个学段入口，2026-10-31 朋大大拍板）
  // 手机号要和 lzti-dev 的 .env 里 DEMO_USER_PHONE 对上，否则演示模式不生效
  // 密码：demo1234（仅开发环境，别用在生产）
  const demoUser = await prisma.user.upsert({
    where: { phone: '19900000000' },
    update: {},
    create: {
      phone: '19900000000',
      passwordHash: '$2b$10$2aWpduDjKEvBdM0vpTn30.D52P5R0D3z.qBz8nJ4o8aaNZ3JSaDFi',
      status: 'ACTIVE',
      name: '演示账号',
      role: 'PARENT',
    },
  });

  console.log('创建演示账号:', demoUser.phone);

  // 给测试用户生成一些邀请码
  for (let i = 0; i < 10; i++) {
    const code = String(100000 + Math.floor(Math.random() * 900000));
    await prisma.userInviteCode.upsert({
      where: { code },
      update: {},
      create: {
        userId: testUser.id,
        code,
      },
    });
  }

  console.log('邀请码初始化完成！');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
