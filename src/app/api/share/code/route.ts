import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getShareStats, logShare } from '@/lib/services/referral.service';

export const GET = requireAuth(async (request: NextRequest, context) => {
  try {
    const stats = await getShareStats(context.user.id);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取分享码失败:', error);
    return NextResponse.json(
      { success: false, error: '获取分享码失败' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json().catch(() => ({}));
    const type = (body.type as 'link' | 'poster' | 'qrcode') || 'link';
    const childId = body.childId as string | undefined;

    const stats = await getShareStats(context.user.id);

    // 记录分享行为
    await logShare(context.user.id, stats.shareCode, type, childId);

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('记录分享失败:', error);
    return NextResponse.json(
      { success: false, error: '记录分享失败' },
      { status: 500 }
    );
  }
});
