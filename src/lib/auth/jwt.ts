import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'lzti-dev-secret-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET ?? DEFAULT_SECRET;
const JWT_EXPIRES_IN = '7d';

// 生产环境检查：只在运行时检查
function checkProductionSecret() {
  if (process.env.NODE_ENV === 'production') {
    const secretFromEnv = process.env.JWT_SECRET;
    if (!secretFromEnv || secretFromEnv === DEFAULT_SECRET) {
      throw new Error('FATAL: JWT_SECRET must be set to a non-default value in production!');
    }
  }
}

// 延迟检查：在首次调用 token 函数时检查
let checked = false;
function ensureProductionCheck() {
  if (!checked) {
    checkProductionSecret();
    checked = true;
  }
}

export interface TokenPayload {
  userId: string;
}

export function generateToken(userId: string): string {
  ensureProductionCheck();
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  ensureProductionCheck();
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
