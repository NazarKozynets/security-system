import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { userHasAllPermissions, userHasAnyRole } from '../helpers/rbac.util';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: SecurityAuditLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0 && requiredRoles.length === 0)
      return true;

    const user = context.switchToHttp().getRequest().user as
      | {
          id?: number;
          email?: string;
          permissions?: string[];
          roles?: string[];
        }
      | undefined;
    const userPermissions = user?.permissions ?? [];
    const userRoles = user?.roles ?? [];

    const okPermissions = userHasAllPermissions(
      userPermissions,
      requiredPermissions,
    );
    const okRoles = userHasAnyRole(userRoles, requiredRoles);

    if (okPermissions && okRoles) return true;

    const req = context.switchToHttp().getRequest();
    this.audit.accessDenied({
      userId: user?.id,
      email: user?.email,
      ip: req.ip,
      path: req.url,
      method: req.method,
      requiredPermissions: requiredPermissions.length
        ? requiredPermissions
        : undefined,
      requiredRoles: requiredRoles.length ? requiredRoles : undefined,
    });

    throw new ForbiddenException('Insufficient permissions');
  }
}
