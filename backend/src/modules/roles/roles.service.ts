import {Injectable} from '@nestjs/common';
import {EventType, Severity} from '@prisma/client';
import {SecurityAuditLogger} from '../../integrations/logger/security-audit-logger.service';
import {RolePermissionRepository} from '../../repositories/role-permission.repository';
import {RoleRepository} from '../../repositories/role.repository';
import {SecurityEventRepository} from '../../repositories/security-event.repository';

// Interface for RolesService
interface IRolesService {
    // Find all roles with permissions
    findAll(): Promise<any[]>;

    // Create a new role
    create(data: { name: string; description?: string }): Promise<any>;

    // Update an existing role
    update(id: number, data: { name?: string; description?: string }): Promise<any>;

    // Delete a role by id
    remove(id: number): Promise<void>;
}

@Injectable()
export class RolesService implements IRolesService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly rolePermissionRepository: RolePermissionRepository,
        private readonly securityEventRepository: SecurityEventRepository,
        private readonly audit: SecurityAuditLogger,
    ) {
    }

    // Find all roles with permissions
    findAll() {
        return this.roleRepository.findAllWithPermissions();
    }

    // Create a new role
    create(data: { name: string; description?: string }) {
        return this.roleRepository.create(data);
    }

    // Update an existing role
    update(id: number, data: { name?: string; description?: string }) {
        return this.roleRepository.update(id, data);
    }

    // Delete a role by id
    async remove(id: number) {
        await this.roleRepository.deleteById(id);
    }

    // Assign permissions to a role
    async assignPermissions(
        roleId: number,
        permissionIds: number[],
        actorId?: number,
    ) {
        // Inserting role-permission pairs
        await this.rolePermissionRepository.insertMany(
            permissionIds.map((permissionId) => ({roleId, permissionId})),
        );

        // Creating security event about role-permission assignment
        await this.securityEventRepository.create({
            userId: actorId,
            eventType: EventType.PERMISSION_CHANGED,
            severity: Severity.HIGH,
            entityType: 'Role',
            entityId: String(roleId),
            description: `Permissions updated for role ${roleId}`,
        });

        // Logging audit event
        this.audit.roleOrPermissionChange('PERMISSIONS_ASSIGNED_TO_ROLE', {
            userId: actorId,
            target: String(roleId),
            details: `permissionIds=${permissionIds.join(',')}`,
        });

        return this.findAll();
    }

    // Remove a permission from a role
    async removePermission(roleId: number, permissionId: number) {
        await this.rolePermissionRepository.deletePair(roleId, permissionId);
    }
}
