import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化邀请码...');

  // 生成多个邀请码
  const codes = [
    { code: '100001', maxUses: 1, expiresInDays: 365 },
    { code: '100002', maxUses: 1, expiresInDays: 365 },
    { code: '100003', maxUses: 1, expiresInDays: 365 },
    { code: '100004', maxUses: 1, expiresInDays: 365 },
    { code: '100005', maxUses: 5, expiresInDays: 365 },
  ];

  for (const { code, maxUses, expiresInDays } of codes) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await prisma.invitationCode.upsert({
      where: { code },
      update: {},
      create: {
        code,
        createdBy: 'system',
        maxUses,
        expiresAt,
      },
    });

    console.log(`创建邀请码: ${code} (可用次数: ${maxUses}, 过期: ${expiresAt.toLocaleDateString()})`);
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
