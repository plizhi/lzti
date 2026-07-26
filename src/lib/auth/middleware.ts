import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './jwt';
import { prisma } from '@/lib/db';

export interface AuthContext {
  user: {
    id: string;
    phone: string | null;
    role: string;
    name: string | null;
  };
}

export async function authMiddleware(request: NextRequest): Promise<AuthContext | null> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, phone: true, role: true, name: true },
    });

    if (!user) {
      return null;
    }

    return { user };
  } catch {
    return null;
  }
}

export function requireAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const context = await authMiddleware(request);

    if (!context) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    return handler(request, context);
  };
}
