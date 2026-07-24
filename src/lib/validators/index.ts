import { ApiError } from '@/lib/api/response';

export function validatePhone(phone: unknown): string {
  if (typeof phone !== 'string') {
    throw new ApiError('手机号格式错误', 400);
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    throw new ApiError('手机号格式错误', 400);
  }
  return phone;
}

export function validatePassword(password: unknown): string {
  if (typeof password !== 'string') {
    throw new ApiError('密码格式错误', 400);
  }
  if (password.length < 6 || password.length > 20) {
    throw new ApiError('密码长度应为6-20位', 400);
  }
  return password;
}

export function validateRequired(value: unknown, fieldName: string): string {
  if (value === undefined || value === null || value === '') {
    throw new ApiError(`${fieldName}不能为空`, 400);
  }
  if (typeof value !== 'string') {
    throw new ApiError(`${fieldName}格式错误`, 400);
  }
  return value;
}

export function validateInvitationCode(code: unknown): string {
  if (typeof code !== 'string') {
    throw new ApiError('邀请码格式错误', 400);
  }
  if (!/^\d{6}$/.test(code)) {
    throw new ApiError('邀请码应为6位数字', 400);
  }
  return code;
}

export function validateChildData(data: {
  name?: string;
  gender?: string;
  birthDate?: string;
  grade?: string;
}) {
  const result: {
    name: string;
    gender?: string;
    birthDate?: Date;
    grade?: string;
  } = {
    name: validateRequired(data.name, '孩子姓名'),
  };

  if (data.gender !== undefined) {
    if (!['MALE', 'FEMALE', 'OTHER'].includes(data.gender)) {
      throw new ApiError('性别格式错误', 400);
    }
    result.gender = data.gender;
  }

  if (data.birthDate !== undefined) {
    const date = new Date(data.birthDate);
    if (isNaN(date.getTime())) {
      throw new ApiError('出生日期格式错误', 400);
    }
    result.birthDate = date;
  }

  if (data.grade !== undefined) {
    result.grade = validateRequired(data.grade, '年级');
  }

  return result;
}

export function validateQuestionnaireType(type: unknown): string {
  if (typeof type !== 'string') {
    throw new ApiError('问卷类型错误', 400);
  }
  if (!['parent', 'student', 'teacher'].includes(type)) {
    throw new ApiError('问卷类型错误', 400);
  }
  return type;
}

export function validateStageId(stageId: unknown): string {
  if (typeof stageId !== 'string') {
    throw new ApiError('学段ID错误', 400);
  }
  const validStageIds = ['primary-low', 'primary-high', 'junior-1', 'junior-3', 'senior-1', 'senior-3'];
  if (!validStageIds.includes(stageId)) {
    throw new ApiError('学段ID错误', 400);
  }
  return stageId;
}
