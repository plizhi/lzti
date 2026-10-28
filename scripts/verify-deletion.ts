/**
 * 真库验证：把「有测评记录的用户」和「有分享批次的孩子」删一遍。
 * 只在开发库跑，跑完清干净。
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const tag = `deltest-${Date.now()}`;

  // 造一棵完整的数据树：User → Child → Session → Attempt → Report
  const user = await prisma.user.create({
    data: { phone: `139${Date.now().toString().slice(-8)}`, status: 'ACTIVE', role: 'PARENT' },
  });
  const child = await prisma.child.create({ data: { userId: user.id, name: '测试孩子' } });
  const session = await prisma.assessmentSession.create({
    data: { childId: child.id, stageId: 'primary-low' },
  });
  const attempt = await prisma.sessionAttempt.create({
    data: {
      sessionId: session.id,
      childId: child.id,
      questionnaireType: 'parent',
      stageId: 'primary-low',
      answers: {},
      scores: {},
      quadrants: {},
    },
  });
  await prisma.attemptReport.create({
    data: { attemptId: attempt.id, currentStatus: [], trajectory: [], suggestions: [] },
  });
  // 再造一个带 slot 的分享批次（Slot -> ShareBatch 是 RESTRICT）
  const batch = await prisma.shareBatch.create({
    data: { userId: user.id, stageId: 'primary-low', questionnaireType: 'register', expiresAt: new Date(Date.now() + 86400000) },
  });
  await prisma.slot.create({
    data: { batchId: batch.id, type: 'register', code: tag.slice(-6), expiresAt: new Date(Date.now() + 86400000) },
  });
  // 还要一个没被 slot 引用的 child，验证删 child 不影响 slot
  const child2 = await prisma.child.create({ data: { userId: user.id, name: '第二个孩子' } });

  console.log('造好数据:', { user: user.id, child: child.id, child2: child2.id, attempt: attempt.id });

  // === 测 1：删孩子（含测评记录） ===
  const { deleteChildTree } = await import('../src/lib/services/deletion.service.ts');
  await prisma.$transaction(async (tx) => {
    await deleteChildTree(tx as never, child.id);
  });

  const afterChild = await prisma.child.findUnique({ where: { id: child.id } });
  const afterAttempt = await prisma.sessionAttempt.findUnique({ where: { id: attempt.id } });
  const afterReport = await prisma.attemptReport.findUnique({ where: { attemptId: attempt.id } });
  const afterSession = await prisma.assessmentSession.findUnique({ where: { id: session.id } });
  console.log('删孩子后:', {
    child: afterChild ? '还在 ❌' : '已删 ✅',
    attempt: afterAttempt ? '还在 ❌' : '已删 ✅',
    report: afterReport ? '还在 ❌' : '已删 ✅',
    session: afterSession ? '还在 ❌' : '已删 ✅',
  });

  // === 测 2：删用户（含分享批次 + slot） ===
  const { deleteUserCascade } = await import('../src/lib/services/deletion.service.ts');
  await deleteUserCascade(user.id);

  const counts = {
    user: await prisma.user.count({ where: { id: user.id } }),
    child2: await prisma.child.count({ where: { id: child2.id } }),
    batch: await prisma.shareBatch.count({ where: { id: batch.id } }),
    slot: await prisma.slot.count({ where: { batchId: batch.id } }),
  };
  console.log('删用户后:', {
    user: counts.user === 0 ? '已删 ✅' : '还在 ❌',
    child2: counts.child2 === 0 ? '已删 ✅' : '还在 ❌',
    batch: counts.batch === 0 ? '已删 ✅' : '还在 ❌',
    slot: counts.slot === 0 ? '已删 ✅' : '还在 ❌',
  });

  const allOk =
    !afterChild && !afterAttempt && !afterReport && !afterSession &&
    counts.user === 0 && counts.child2 === 0 && counts.batch === 0 && counts.slot === 0;
  console.log(allOk ? '\n全部通过 ✅' : '\n有残留 ❌');
  await prisma.$disconnect();
  process.exit(allOk ? 0 : 1);
}

main().catch(async (e) => {
  console.error('失败:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
