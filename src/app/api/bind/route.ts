import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateToken } from '@/lib/auth';

const NZYY_API_URL = process.env.NZYY_API_URL || 'https://nzyy.cc/api';

/**
 * 调用 nzyy 验证 token
 * nzyy 提供 /api/portal/verify-bind 接口
 */
async function verifyNzyyToken(token: string): Promise<{ valid: boolean; phone?: string; error?: string }> {
  try {
    const res = await fetch(`${NZYY_API_URL}/portal/verify-bind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, target_app: 'lzti' }),
    });
    const data = await res.json();
    if (data.valid === true) {
      return { valid: true, phone: data.phone };
    }
    return { valid: false, error: data.error || '验证失败' };
  } catch (err) {
    console.error('[bind] verifyNzyyToken error:', err);
    return { valid: false, error: '网络错误' };
  }
}

/**
 * POST /api/bind
 * 从 nzyy 跳转过来时，创建或更新用户（nzyyStatus=pending）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, token } = body;

    // 安全检查
    if (from !== 'nzyy' || !token) {
      return NextResponse.json(
        { success: false, error: '参数错误' },
        { status: 400 }
      );
    }

    // 验证 token（调用 nzyy API）
    const verifyResult = await verifyNzyyToken(token);
    if (!verifyResult.valid || !verifyResult.phone) {
      return NextResponse.json(
        { success: false, error: verifyResult.error || '验证失败' },
        { status: 401 }
      );
    }

    const phone = verifyResult.phone;

    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      // 新建用户
      user = await prisma.user.create({
        data: {
          phone,
          nzyyStatus: 'pending',
          nzyySource: 'nzyy',
          nzyyExpireAt: new Date('2030-01-01'), // long-term pending
        },
      });
    } else {
      // 已存在用户
      // 如果用户已经是 nzyy 用户（有过绑定），不重复更新
      if (user.nzyyStatus === 'active') {
        // 已是 nzyy 激活用户，直接返回 token
        const jwt = generateToken(user.id);
        return NextResponse.json({
          success: true,
          data: {
            token: jwt,
            isNew: false,
            pending: false,
          },
        });
      }

      // 更新为 pending
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          nzyyStatus: 'pending',
          nzyySource: 'nzyy',
          nzyyExpireAt: new Date('2030-01-01'),
        },
      });
    }

    // 生成登录 token
    const token_ = generateToken(user.id);

    return NextResponse.json({
      success: true,
      data: {
        token: token_,
        isNew: true,
        pending: user.nzyyStatus === 'pending',
      },
    });
  } catch (err) {
    console.error('[bind] error:', err);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
