import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getUserCoupons } from '@/lib/services/point.service';

export const GET = requireAuth(async (request: NextRequest, context) => {
  try {
    const coupons = await getUserCoupons(context.user.id);

    return NextResponse.json({
      success: true,
      data: coupons,
    });
  } catch (error) {
    console.error('获取券列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取券列表失败' },
      { status: 500 }
    );
  }
});
