import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { generateQuarterlySummary } from '@/lib/services/quarterly-summary.service';

export const GET = requireAuth(async (request: NextRequest, context) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json(
        { success: false, error: '请提供 childId' },
        { status: 400 }
      );
    }

    const summary = await generateQuarterlySummary(context.user.id, childId);

    if (!summary) {
      return NextResponse.json({
        success: true,
        data: null,
        message: '暂无足够数据生成季度摘要',
      });
    }

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error('生成季度摘要失败:', error);
    return NextResponse.json(
      { success: false, error: '生成季度摘要失败' },
      { status: 500 }
    );
  }
});
