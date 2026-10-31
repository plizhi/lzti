import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api/response';
import { withDeviceAuth } from '@/lib/device-auth';
import { requireDemoDevice } from '@/lib/demo';
import { stages } from '@/data/questionnaires';
import type { StageId } from '@/types/stage';

/**
 * GET /api/device/demo/stages
 *
 * 演示专用：返回六个学段入口（小学低 / 小学高 / 初一初二 / 初三 / 高一高二 / 高三）。
 *
 * 演示形态是「一个 demo 账号 + 六个学段入口」，所以设备拿到这个列表后
 * 让用户在屏幕上选学段，而不是让设备去登六个不同的账号。
 *
 * 只有绑定到演示账号的设备能访问；真实用户设备一律 403。
 */
export const GET = withDeviceAuth(async (_request: NextRequest, device) => {
  await requireDemoDevice(device.userId);

  const list = Object.values(stages).map((s) => ({
    id: s.id as StageId,
    name: s.name,
    gradeRange: s.gradeRange,
    coreAbility: s.coreAbility,
    dimensionCount: s.dimensionCount,
    description: s.description,
  }));

  return apiSuccess({ stages: list });
});
