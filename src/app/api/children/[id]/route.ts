import { NextRequest } from 'next/server';
import { getChild, updateChild, deleteChild } from '@/lib/services/child.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';

export const GET = withAuth(async (request, context) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || request.url.split('/').pop()!;
  const child = await getChild(id, context.user.id);
  return apiSuccess(child);
});

export const PUT = withAuth(async (request, context) => {
  const id = request.url.split('/').pop()!;
  const body = await request.json();
  const child = await updateChild(id, context.user.id, body);
  return apiSuccess(child);
});

export const DELETE = withAuth(async (request, context) => {
  const id = request.url.split('/').pop()!;
  await deleteChild(id, context.user.id);
  return apiSuccess({ message: '孩子档案已删除' });
});
