import { describe, it, expect } from 'vitest';
import { apiSuccess, apiError } from '@/lib/api/response';

/**
 * 错误响应的契约。
 *
 * 背景：项目里有 14 处写成 apiSuccess({ error: 'xxx' }, 403)，
 * 返回体是 { success: true, data: { error } } —— HTTP 状态是 403，
 * 但 body 里 success 是 true。前端统一按 json.success 判断，
 * 于是 403 被当成成功，错误信息被当数据渲染。
 */
describe('apiError 契约', () => {
  it('错误响应必须是 success: false', async () => {
    const res = apiError('需要管理员权限', 403);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('需要管理员权限');
  });

  it('成功响应必须是 success: true', async () => {
    const res = apiSuccess({ id: '1' });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: '1' });
  });

  it('错误响应不应把错误信息放进 data', async () => {
    // 这就是原来 14 处的写法：前端 json.success 为 true → 走成功分支，
    // 把 { error: '需要管理员权限' } 当成统计数据渲染
    const res = apiError('需要管理员权限', 403);
    const body = await res.json();

    expect(body.data).toBeUndefined();
  });
});
