import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'lzti-dev-secret-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET ?? DEFAULT_SECRET;
const TICKET_EXPIRES_IN = '10m';
const TICKET_AUDIENCE = 'registration';

export type RegistrationTicketSource = 'slot' | 'sso';

export interface RegistrationTicketPayload {
  userId: string;
  /** 手机号已由认证服务验证（SSO 来源）；邀请码来源为空，手机号由用户自己填 */
  phone: string | null;
  source: RegistrationTicketSource;
}

/**
 * 注册票据：证明「调用者有权完成这个预账户的注册」。
 *
 * 以前注册接口直接收前端传来的 userId，谁拿到别人的 userId 就能替他把
 * 账户设成自己的密码。票据由服务端签发、前端无法伪造，
 * userId 只能从票据里解出来，前端说了不算。
 */
export function issueRegistrationTicket(
  userId: string,
  options: { phone?: string | null; source: RegistrationTicketSource }
): string {
  return jwt.sign(
    {
      userId,
      phone: options.phone ?? null,
      source: options.source,
    },
    JWT_SECRET,
    { expiresIn: TICKET_EXPIRES_IN, audience: TICKET_AUDIENCE }
  );
}

export function verifyRegistrationTicket(ticket: string): RegistrationTicketPayload {
  const payload = jwt.verify(ticket, JWT_SECRET, { audience: TICKET_AUDIENCE });

  if (typeof payload === 'string' || !payload.userId) {
    throw new Error('invalid registration ticket');
  }

  return {
    userId: String(payload.userId),
    phone: typeof payload.phone === 'string' ? payload.phone : null,
    source: payload.source === 'sso' ? 'sso' : 'slot',
  };
}
