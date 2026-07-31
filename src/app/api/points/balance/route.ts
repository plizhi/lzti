import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getPointBalance } from '@/lib/services/point.service';

export const GET = requireAuth(async (request: NextRequest, context) => {
  try {
    const balance = await getPointBalance(context.user.id);
    return NextResponse.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    console.error('获取积分余额失败:', error);
    return NextResponse.json(
      { success: false, error: '获取积分余额失败' },
      { status: 500 }
    );
  }
});
