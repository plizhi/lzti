import { NextRequest } from 'next/server';
import { getChildren, createChild } from '@/lib/services/child.service';
import { withAuth, apiSuccess } from '@/lib/api/handler';
import { parseJsonBody } from '@/lib/api/response';

interface ChildCreateBody {
  name: string;
  gender?: string;
  birthDate?: string;
  grade?: string;
}

export const GET = withAuth(async (request, context) => {
  const children = await getChildren(context.user.id);
  return apiSuccess({ children });
});

export const POST = withAuth(async (request, context) => {
  const body = await parseJsonBody<ChildCreateBody>(request);
  const child = await createChild(context.user.id, body);
  return apiSuccess(child, 201);
});
