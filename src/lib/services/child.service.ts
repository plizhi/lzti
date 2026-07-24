import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/response';
import { validateChildData } from '@/lib/validators';

export async function getChildren(userId: string) {
  const children = await prisma.child.findMany({
    where: { userId },
    include: {
      sessions: {
        select: {
          id: true,
          stageId: true,
          completed: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return children;
}

export async function getChild(childId: string, userId: string) {
  const child = await prisma.child.findFirst({
    where: { id: childId, userId },
    include: {
      sessions: {
        include: {
          attempts: {
            select: {
              id: true,
              questionnaireType: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!child) {
    throw new ApiError('孩子档案不存在', 404);
  }

  return child;
}

export async function createChild(userId: string, data: {
  name: string;
  gender?: string;
  birthDate?: string;
  grade?: string;
}) {
  const childData = validateChildData(data);

  const child = await prisma.child.create({
    data: {
      userId,
      name: childData.name,
      gender: childData.gender,
      birthDate: childData.birthDate,
      grade: childData.grade,
    },
  });

  return child;
}

export async function updateChild(
  childId: string,
  userId: string,
  data: {
    name?: string;
    gender?: string;
    birthDate?: string;
    grade?: string;
  }
) {
  // 验证是否存在且属于当前用户
  const existing = await prisma.child.findFirst({
    where: { id: childId, userId },
  });

  if (!existing) {
    throw new ApiError('孩子档案不存在', 404);
  }

  const updateData: {
    name?: string;
    gender?: string;
    birthDate?: Date | null;
    grade?: string;
  } = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.gender !== undefined) {
    if (!['MALE', 'FEMALE', 'OTHER'].includes(data.gender)) {
      throw new ApiError('性别格式错误', 400);
    }
    updateData.gender = data.gender;
  }
  if (data.birthDate !== undefined) {
    if (data.birthDate) {
      const date = new Date(data.birthDate);
      if (isNaN(date.getTime())) {
        throw new ApiError('出生日期格式错误', 400);
      }
      updateData.birthDate = date;
    } else {
      updateData.birthDate = null;
    }
  }
  if (data.grade !== undefined) {
    updateData.grade = data.grade;
  }

  const child = await prisma.child.update({
    where: { id: childId },
    data: updateData,
  });

  return child;
}

export async function deleteChild(childId: string, userId: string) {
  const existing = await prisma.child.findFirst({
    where: { id: childId, userId },
  });

  if (!existing) {
    throw new ApiError('孩子档案不存在', 404);
  }

  // 级联删除：先删除关联的 sessions（会级联删除 attempts 和 reports）
  await prisma.assessmentSession.deleteMany({
    where: { childId },
  });

  // 删除孩子档案
  await prisma.child.delete({
    where: { id: childId },
  });

  return { success: true };
}
