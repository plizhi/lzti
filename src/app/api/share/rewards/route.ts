import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getShareRewards } from '@/lib/services/referral.service';

export const GET = requireAuth(async (request: NextRequest, context) => {
  try {
    const rewards = await getShareRewards(context.user.id);
    return NextResponse.json({ success: true, data: rewards });
  } catch (error) {
    console.error('获取分享奖励失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分享奖励失败' },
      { status: 500 }
    );
  }
});
