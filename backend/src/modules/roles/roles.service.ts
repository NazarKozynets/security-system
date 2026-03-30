import { Injectable } from '@nestjs/common';
import { EventType, Severity } from '@prisma/client';
import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditLogger,
  ) {}

  findAll() {
    return this.prisma.role.findMany({
      include: { rolePermissions: { include: { permission: true } } },
    });
  }
  create(data: { name: string; description?: string }) {
    return this.prisma.role.create({ data });
  }
  update(id: number, data: { name?: string; description?: string }) {
    return this.prisma.role.update({ where: { id }, data });
  }
  remove(id: number) {
    return this.prisma.role.delete({ where: { id } });
  }
  async assignPermissions(
    roleId: number,
    permissionIds: number[],
    actorId?: number,
  ) {
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
    await this.prisma.securityEvent.create({
      data: {
        userId: actorId,
        eventType: EventType.PERMISSION_CHANGED,
        severity: Severity.HIGH,
        entityType: 'Role',
        entityId: String(roleId),
        description: `Permissions updated for role ${roleId}`,
      },
    });
    this.audit.roleOrPermissionChange('PERMISSIONS_ASSIGNED_TO_ROLE', {
      userId: actorId,
      target: String(roleId),
      details: `permissionIds=${permissionIds.join(',')}`,
    });
    return this.findAll();
  }
  removePermission(roleId: number, permissionId: number) {
    return this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }
}
