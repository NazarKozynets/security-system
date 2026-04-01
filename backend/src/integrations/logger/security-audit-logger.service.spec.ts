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

  it('logs user registered', () => {
    const audit = new SecurityAuditLogger(winston);
    audit.userRegistered({ userId: 3, email: 'n@x.y' });
    expect(info).toHaveBeenCalledWith(
      'USER_REGISTERED',
      expect.objectContaining({ category: 'security', userId: 3 }),
    );
  });

  it('logs login failure and account lockout', () => {
    const audit = new SecurityAuditLogger(winston);
    audit.loginFailure({ email: 'a@b.c', reason: 'bad' });
    expect(warn).toHaveBeenCalledWith(
      'LOGIN_FAILURE',
      expect.objectContaining({ category: 'security' }),
    );
    warn.mockClear();
    audit.accountLockout({ userId: 1, until: '2099-01-01' });
    expect(warn).toHaveBeenCalledWith(
      'ACCOUNT_LOCKOUT',
      expect.objectContaining({ userId: 1 }),
    );
  });

  it('logs roleOrPermissionChange, securityEventLogged, reportGenerated', () => {
    const audit = new SecurityAuditLogger(winston);
    audit.roleOrPermissionChange('ROLE_X', { userId: 1, target: 't' });
    expect(info).toHaveBeenCalledWith(
      'ROLE_X',
      expect.objectContaining({ category: 'security' }),
    );
    info.mockClear();
    audit.securityEventLogged({ eventType: 'E', description: 'd' });
    expect(info).toHaveBeenCalledWith(
      'SECURITY_EVENT',
      expect.objectContaining({ category: 'security' }),
    );
    info.mockClear();
    audit.reportGenerated({ userId: 2, reportType: 'csv' });
    expect(info).toHaveBeenCalledWith(
      'REPORT_GENERATED',
      expect.objectContaining({ reportType: 'csv' }),
    );
  });
});
