import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { transferCoupon } from '@/lib/services/point.service';

export const POST = requireAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { code, newOwnerId } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: '缺少券码' },
        { status: 400 }
      );
    }

    await transferCoupon(code, newOwnerId);

    return NextResponse.json({
      success: true,
      message: '券已转让',
    });
  } catch (error) {
    console.error('转让券失败:', error);
    return NextResponse.json(
      { success: false, error: '转让券失败' },
      { status: 500 }
    );
  }
});
