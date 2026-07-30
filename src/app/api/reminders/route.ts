import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getPendingReminders, getUpcomingReminders } from '@/lib/services/reminder.service';

export const GET = requireAuth(async (request: NextRequest, context) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'pending'; // 'pending' | 'upcoming'

    let reminders;
    if (type === 'upcoming') {
      reminders = await getUpcomingReminders(context.user.id);
    } else {
      reminders = await getPendingReminders(context.user.id);
    }

    return NextResponse.json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    console.error('获取提醒失败:', error);
    return NextResponse.json(
      { success: false, error: '获取提醒失败' },
      { status: 500 }
    );
  }
});
