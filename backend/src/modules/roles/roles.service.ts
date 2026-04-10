import { Injectable } from '@nestjs/common';
import { EventType, Severity } from '@prisma/client';
import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { RolePermissionRepository } from '../../repositories/role-permission.repository';
import { RoleRepository } from '../../repositories/role.repository';
import { SecurityEventRepository } from '../../repositories/security-event.repository';

@Injectable()
export class RolesService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly rolePermissionRepository: RolePermissionRepository,
    private readonly securityEventRepository: SecurityEventRepository,
    private readonly audit: SecurityAuditLogger,
  ) {}

  findAll() {
    return this.roleRepository.findAllWithPermissions();
  }
  create(data: { name: string; description?: string }) {
    return this.roleRepository.create(data);
  }
  update(id: number, data: { name?: string; description?: string }) {
    return this.roleRepository.update(id, data);
  }
  async remove(id: number) {
    await this.roleRepository.deleteById(id);
  }
  async assignPermissions(
    roleId: number,
    permissionIds: number[],
    actorId?: number,
  ) {
    await this.rolePermissionRepository.insertMany(
      permissionIds.map((permissionId) => ({ roleId, permissionId })),
    );
    await this.securityEventRepository.create({
      userId: actorId,
      eventType: EventType.PERMISSION_CHANGED,
      severity: Severity.HIGH,
      entityType: 'Role',
      entityId: String(roleId),
      description: `Permissions updated for role ${roleId}`,
    });
    this.audit.roleOrPermissionChange('PERMISSIONS_ASSIGNED_TO_ROLE', {
      userId: actorId,
      target: String(roleId),
      details: `permissionIds=${permissionIds.join(',')}`,
    });
    return this.findAll();
  }
  async removePermission(roleId: number, permissionId: number) {
    await this.rolePermissionRepository.deletePair(roleId, permissionId);
  }
}
