import { Injectable } from '@nestjs/common';
import { WinstonLoggerService } from './winston-logger.service';

// Context for security audit events
export type SecurityAuditContext = {
  userId?: number;
  email?: string;
  ip?: string;
  path?: string;
  method?: string;
  metadata?: Record<string, unknown>;
};

// Logger for security audit events
// TODO: CREATE AND INTEGRATE ENUM WITH ALL OF AVAILABLE EVENTS
@Injectable()
export class SecurityAuditLogger {
  constructor(private readonly winston: WinstonLoggerService) {}

  // Logs successful login attempt
  loginSuccess(ctx: SecurityAuditContext) {
    this.winston.logger.info('LOGIN_SUCCESS', {
      category: 'security',
      ...ctx,
    });
  }

  // Logs failed login attempt
  loginFailure(ctx: SecurityAuditContext & { reason?: string }) {
    this.winston.logger.warn('LOGIN_FAILURE', {
      category: 'security',
      ...ctx,
    });
  }

  // Logs new user registration
  userRegistered(ctx: SecurityAuditContext) {
    this.winston.logger.info('USER_REGISTERED', {
      category: 'security',
      ...ctx,
    });
  }

  // Logs account lockout
  accountLockout(ctx: SecurityAuditContext & { until?: string }) {
    this.winston.logger.warn('ACCOUNT_LOCKOUT', {
      category: 'security',
      ...ctx,
    });
  }

  // Logs any of denied access attempts
  accessDenied(
    ctx: SecurityAuditContext & {
      requiredPermissions?: string[];
      requiredRoles?: string[];
    },
  ) {
    this.winston.logger.warn('ACCESS_DENIED', {
      category: 'security',
      ...ctx,
    });
  }

  // Logs change of role or permission
  roleOrPermissionChange(
    action: string,
    ctx: SecurityAuditContext & { target?: string; details?: string },
  ) {
    this.winston.logger.info(action, {
      category: 'security',
      ...ctx,
    });
  }

  // Logs any security event
  securityEventLogged(
    ctx: SecurityAuditContext & { eventType?: string; description?: string },
  ) {
    this.winston.logger.info('SECURITY_EVENT', {
      category: 'security',
      ...ctx,
    });
  }

  // Generates a report
  reportGenerated(ctx: SecurityAuditContext & { reportType?: string }) {
    this.winston.logger.info('REPORT_GENERATED', {
      category: 'security',
      ...ctx,
    });
  }
}
