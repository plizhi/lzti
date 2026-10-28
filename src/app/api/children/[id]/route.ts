import { NextRequest } from 'next/server';
import { getChild, updateChild, deleteChild } from '@/lib/services/child.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { parseJsonBody } from '@/lib/api/response';

interface ChildUpdateBody {
  name?: string;
  gender?: string;
  birthDate?: string;
  grade?: string;
}

// id 一律从路由参数取。
// 原来用 request.url.split('/').pop() 取，URL 里一带 query string
// （?id=xxx）就取到错误的值，删/改孩子直接 404。
export const GET = withAuth<unknown, { id: string }>(async (request, context) => {
  const { id } = await context.params;
  const child = await getChild(id, context.user.id);
  return apiSuccess(child);
});

export const PUT = withAuth<unknown, { id: string }>(async (request, context) => {
  const { id } = await context.params;
  const body = await parseJsonBody<ChildUpdateBody>(request);
  const child = await updateChild(id, context.user.id, body);
  return apiSuccess(child);
});

export const DELETE = withAuth<unknown, { id: string }>(async (request, context) => {
  const { id } = await context.params;
  await deleteChild(id, context.user.id);
  return apiSuccess({ message: '孩子档案已删除' });
});
