/**
 * 验证「删除被推荐人」后，其 referral 行不会污染后续注册。
 *
 * 背景：referral.service 的 onReferralRegistered 会 findFirst({shareCode, refereeId: null})
 * 捡起「未关联」的 referral 行绑到新用户身上。若删除用户时把 refereeId 置空而不是删行，
 * 一个「已发过奖励」的老记录会被转手给下一个用同码注册的人。
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const stamp = Date.now().toString().slice(-6);
const SUFFIX = process.env.VERIFY_SUFFIX ?? stamp;

const REFERRER = `vf-ref-${SUFFIX}`;
const VICTIM = `vf-vic-${SUFFIX}`;
const NEWCOMER = `vf-new-${SUFFIX}`;
const SHARE = `VFS${SUFFIX}`;

async function main() {
  const { deleteUserCascade } = await import('../src/lib/services/deletion.service');
  const { onReferralRegistered } = await import('../src/lib/services/referral.service');

  // 造数据：推荐人（有 shareCode）+ 被推荐人 + 一条已发过奖励的 referral
  await prisma.user.create({
    data: { id: REFERRER, phone: `139${SUFFIX}1`, passwordHash: 'x', status: 'ACTIVE', role: 'PARENT', shareCode: SHARE },
  });
  await prisma.user.create({
    data: { id: VICTIM, phone: `139${SUFFIX}2`, passwordHash: 'x', status: 'ACTIVE', role: 'PARENT', shareCode: `VIC${SUFFIX}` },
  });
  await prisma.referral.create({
    data: {
      id: `vf-referral-${SUFFIX}`,
      referrerId: REFERRER,
      refereeId: VICTIM,
      shareCode: SHARE,
      pointsRegistered: true,   // 老用户已发过注册奖励
      pointsAssessed: false,
      rewardSubscribed: false,
    },
  });

  console.log('造好数据:', { REFERRER, VICTIM, SHARE });

  // 删被推荐人
  await deleteUserCascade(VICTIM);
  console.log('已删除被推荐人\n');

  const afterDel = await prisma.referral.findMany({ where: { shareCode: SHARE } });
  console.log('删后该 shareCode 下的 referral 行:', afterDel.map(r => ({ id: r.id, refereeId: r.refereeId })));

  // 新用户用同一 shareCode 注册
  await prisma.user.create({
    data: { id: NEWCOMER, phone: `139${SUFFIX}3`, passwordHash: 'x', status: 'ACTIVE', role: 'PARENT' },
  });
  const r = await onReferralRegistered(NEWCOMER, SHARE);
  console.log('\nonReferralRegistered(新用户) →', r ? { id: r.id, refereeId: r.refereeId } : null);

  const final = await prisma.referral.findMany({ where: { shareCode: SHARE } });
  const contaminated = final.some(
    (x) => x.refereeId === NEWCOMER && x.id === `vf-referral-${SUFFIX}`
  );

  if (contaminated) {
    console.log('\n❌ 缺陷：已删除用户的 referral 行被新用户捡走了');
    console.log('   老记录带着 pointsRegistered=true → 新人拿不到本该发的注册积分');
  } else if (r === null) {
    console.log('\n✅ 通过：新用户没有捡到任何 referral（老行已删干净）');
  } else {
    console.log('\n⚠️  新建了独立的 referral 行（老行已删），这是正确行为');
  }

  // 清理
  await prisma.referral.deleteMany({ where: { shareCode: SHARE } });
  await prisma.user.deleteMany({ where: { id: { in: [REFERRER, VICTIM, NEWCOMER] } } });

  await prisma.$disconnect();
  process.exit(contaminated ? 1 : 0);
}

main().catch(async (e) => {
  console.error('失败:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
