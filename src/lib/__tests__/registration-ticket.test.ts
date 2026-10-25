import { describe, it, expect } from 'vitest';
import { issueRegistrationTicket, verifyRegistrationTicket } from '@/lib/auth/registration-ticket';

describe('registration ticket', () => {
  it('should carry the userId and phone', () => {
    const ticket = issueRegistrationTicket('user-1', { phone: '13800000001', source: 'sso' });
    const payload = verifyRegistrationTicket(ticket);

    expect(payload.userId).toBe('user-1');
    expect(payload.phone).toBe('13800000001');
    expect(payload.source).toBe('sso');
  });

  it('should default the phone to null for slot registration', () => {
    const ticket = issueRegistrationTicket('user-2', { source: 'slot' });
    const payload = verifyRegistrationTicket(ticket);

    expect(payload.phone).toBeNull();
    expect(payload.source).toBe('slot');
  });

  it('should reject a ticket signed with another secret', () => {
    const forged = issueRegistrationTicket('user-3', { source: 'slot' });
    // 篡改载荷里的 userId，签名就不成立了
    const [header, payload, signature] = forged.split('.');
    const tampered = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), userId: 'victim' })
    ).toString('base64url');

    expect(() => verifyRegistrationTicket(`${header}.${tampered}.${signature}`)).toThrow();
  });

  it('should reject a ticket that was not issued for registration', () => {
    // 会话 token 的 audience 是 lzti-session，不能当注册票据用
    expect(() => verifyRegistrationTicket('not-a-ticket')).toThrow();
  });
});
