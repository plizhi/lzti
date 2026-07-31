import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { redeemPointsForCoupon } from '@/lib/services/point.service';

export const POST = requireAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { type } = body;

    if (!type || !['lixin', 'shengxue'].includes(type)) {
      return NextResponse.json(
        { success: false, error: '无效的券类型' },
        { status: 400 }
      );
    }

    const result = await redeemPointsForCoupon(context.user.id, type);

    return NextResponse.json({
      success: true,
      data: {
        couponCode: result.couponCode,
        type,
        typeName: type === 'lixin' ? '荔心卷' : '升学指数',
      },
    });
  } catch (error) {
    console.error('积分兑换券失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '积分兑换券失败',
      },
      { status: 500 }
    );
  }
});
