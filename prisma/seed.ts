import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
