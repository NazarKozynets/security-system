import { SecurityAuditLogger } from './security-audit-logger.service';
import { WinstonLoggerService } from './winston-logger.service';

describe('SecurityAuditLogger', () => {
  const info = jest.fn();
  const warn = jest.fn();
  const winston = {
    logger: { info, warn },
  } as unknown as WinstonLoggerService;

  beforeEach(() => {
    info.mockClear();
    warn.mockClear();
  });

  it('logs login success', () => {
    const audit = new SecurityAuditLogger(winston);
    audit.loginSuccess({ userId: 1, email: 'a@b.c' });
    expect(info).toHaveBeenCalledWith(
      'LOGIN_SUCCESS',
      expect.objectContaining({ category: 'security', userId: 1 }),
    );
  });

  it('logs access denied', () => {
    const audit = new SecurityAuditLogger(winston);
    audit.accessDenied({ userId: 2, requiredPermissions: ['p'] });
    expect(warn).toHaveBeenCalledWith(
      'ACCESS_DENIED',
      expect.objectContaining({ category: 'security' }),
    );
  });
});
