'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Reminder {
  id: string;
  childId: string;
  attemptId: string;
  remindAt: string;
  status: string;
}

export function ReminderPanel() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const response = await fetch('/api/reminders', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('lzti_token')}`,
        },
      });
      const json = await response.json();
      if (json.success && json.data) {
        setReminders(json.data);
      }
    } catch (err) {
      console.error('获取提醒失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return '已到提醒时间';
    } else if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '明天';
    } else {
      return `${diffDays}天后`;
    }
  };

  const isOverdue = (dateStr: string) => {
    return new Date(dateStr).getTime() <= Date.now();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-4 text-stone-500 text-sm">
        暂无复测提醒
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className={`p-3 rounded-xl border ${
            isOverdue(reminder.remindAt)
              ? 'bg-amber-50 border-amber-200'
              : 'bg-stone-50 border-stone-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${
                isOverdue(reminder.remindAt) ? 'text-amber-700' : 'text-stone-700'
              }`}>
                {isOverdue(reminder.remindAt) ? '🔔' : '📅'} {formatDate(reminder.remindAt)}
              </p>
              <p className="text-xs text-stone-500">
                {new Date(reminder.remindAt).toLocaleDateString('zh-CN')}
              </p>
            </div>
            <Link
              href="/children"
              className="px-3 py-1 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600"
            >
              去测评
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
