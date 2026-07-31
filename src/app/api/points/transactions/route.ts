import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getPointTransactions } from '@/lib/services/point.service';

export const GET = requireAuth(async (request: NextRequest, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const transactions = await getPointTransactions(context.user.id, limit, offset);

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('获取积分流水失败:', error);
    return NextResponse.json(
      { success: false, error: '获取积分流水失败' },
      { status: 500 }
    );
  }
});
