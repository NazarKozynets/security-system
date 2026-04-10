import { Injectable, NotFoundException } from '@nestjs/common';
import { EventType, Severity, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mapUserResponse } from '../../common/dto/user-response.dto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SecurityAuditLogger } from '../../integrations/logger/security-audit-logger.service';
import { SecurityEventRepository } from '../../repositories/security-event.repository';
import { UserRepository } from '../../repositories/user.repository';
import { UserRoleRepository } from '../../repositories/user-role.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly securityEventRepository: SecurityEventRepository,
    private readonly audit: SecurityAuditLogger,
  ) {}

  async findAll(page = 1, limit = 20) {
    const users = await this.userRepository.findAllPaginated(page, limit);
    return users.map((u) => mapUserResponse(u));
  }

  async findOne(id: number) {
    const user = await this.userRepository.findByIdWithRbac(id);
    if (!user) throw new NotFoundException('User not found');
    return mapUserResponse(user);
  }

  async create(dto: any, actorId?: number) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.client.$transaction(async (tx) => {
      const created = await this.userRepository.create(
        {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: dto.status ?? UserStatus.ACTIVE,
        },
        tx,
      );
      if (dto.roleIds?.length) {
        await this.userRoleRepository.insertMany(
          dto.roleIds.map((roleId: number) => ({
            userId: created.id,
            roleId,
          })),
          tx,
        );
      }
      await this.securityEventRepository.create(
        {
          userId: actorId,
          eventType: EventType.USER_CREATED,
          severity: Severity.LOW,
          entityType: 'User',
          entityId: String(created.id),
          description: `User created ${dto.email.toLowerCase()}`,
        },
        tx,
      );
      return this.userRepository.findByIdWithRbac(created.id, tx);
    });
    if (!user) throw new Error('User not found after create');
    this.audit.roleOrPermissionChange('USER_CREATED', {
      userId: actorId,
      target: user.email,
      details: `created user id=${user.id}`,
    });
    return this.findOne(user.id);
  }

  async update(id: number, dto: any, actorId?: number) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
    if (dto.email) data.email = dto.email.toLowerCase();
    delete data.password;
    delete data.roleIds;
    await this.prisma.client.$transaction(async (tx) => {
      await this.userRepository.updateFields(id, data, tx);
      if (dto.roleIds) {
        await this.userRoleRepository.deleteAllForUser(id, tx);
        await this.userRoleRepository.insertMany(
          dto.roleIds.map((roleId: number) => ({ userId: id, roleId })),
          tx,
        );
      }
      await this.securityEventRepository.create(
        {
          userId: actorId,
          eventType: EventType.USER_UPDATED,
          severity: Severity.LOW,
          entityType: 'User',
          entityId: String(id),
          description: `User updated ${id}`,
        },
        tx,
      );
    });
    this.audit.roleOrPermissionChange('USER_UPDATED', {
      userId: actorId,
      target: String(id),
      details: 'user profile or roles updated',
    });
    return this.findOne(id);
  }

  async updateStatus(id: number, status: UserStatus, actorId?: number) {
    await this.findOne(id);
    const user = await this.userRepository.updateStatus(id, status);
    await this.securityEventRepository.create({
      userId: actorId,
      eventType:
        status === UserStatus.BLOCKED
          ? EventType.USER_BLOCKED
          : EventType.USER_UPDATED,
      severity: status === UserStatus.BLOCKED ? Severity.HIGH : Severity.MEDIUM,
      entityType: 'User',
      entityId: String(id),
      description: `User status changed to ${status}`,
    });
    this.audit.roleOrPermissionChange('USER_STATUS_CHANGED', {
      userId: actorId,
      target: String(id),
      details: `status=${status}`,
    });
    return mapUserResponse({ ...user, userRoles: [] });
  }

  async disable(id: number, actorId?: number) {
    return this.updateStatus(id, UserStatus.DISABLED, actorId);
  }

  async assignRoles(id: number, roleIds: number[], actorId?: number) {
    await this.userRoleRepository.insertMany(
      roleIds.map((roleId) => ({ userId: id, roleId })),
    );
    await this.securityEventRepository.create({
      userId: actorId,
      eventType: EventType.ROLE_ASSIGNED,
      severity: Severity.MEDIUM,
      entityType: 'User',
      entityId: String(id),
      description: `Roles assigned to user ${id}`,
    });
    this.audit.roleOrPermissionChange('ROLE_ASSIGNED', {
      userId: actorId,
      target: String(id),
      details: `roleIds=${roleIds.join(',')}`,
    });
    return this.findOne(id);
  }

  async removeRole(userId: number, roleId: number, actorId?: number) {
    await this.userRoleRepository.deletePair(userId, roleId);
    await this.securityEventRepository.create({
      userId: actorId,
      eventType: EventType.ROLE_REMOVED,
      severity: Severity.MEDIUM,
      entityType: 'User',
      entityId: String(userId),
      description: `Role ${roleId} removed`,
    });
    this.audit.roleOrPermissionChange('ROLE_REMOVED', {
      userId: actorId,
      target: String(userId),
      details: `roleId=${roleId}`,
    });
    return { success: true };
  }
}
