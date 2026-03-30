import { Injectable } from '@nestjs/common';
import { WinstonLoggerService } from './winston-logger.service';

export type SecurityAuditContext = {
  userId?: number;
  email?: string;
  ip?: string;
  path?: string;
  method?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class SecurityAuditLogger {
  constructor(private readonly winston: WinstonLoggerService) {}

  loginSuccess(ctx: SecurityAuditContext) {
    this.winston.logger.info('LOGIN_SUCCESS', {
      category: 'security',
      ...ctx,
    });
  }

  loginFailure(ctx: SecurityAuditContext & { reason?: string }) {
    this.winston.logger.warn('LOGIN_FAILURE', {
      category: 'security',
      ...ctx,
    });
  }

  accountLockout(ctx: SecurityAuditContext & { until?: string }) {
    this.winston.logger.warn('ACCOUNT_LOCKOUT', {
      category: 'security',
      ...ctx,
    });
  }

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

  roleOrPermissionChange(
    action: string,
    ctx: SecurityAuditContext & { target?: string; details?: string },
  ) {
    this.winston.logger.info(action, {
      category: 'security',
      ...ctx,
    });
  }

  securityEventLogged(
    ctx: SecurityAuditContext & { eventType?: string; description?: string },
  ) {
    this.winston.logger.info('SECURITY_EVENT', {
      category: 'security',
      ...ctx,
    });
  }

  reportGenerated(ctx: SecurityAuditContext & { reportType?: string }) {
    this.winston.logger.info('REPORT_GENERATED', {
      category: 'security',
      ...ctx,
    });
  }
}
