import { Injectable, NotFoundException } from '@nestjs/common';
import { EventType, Severity, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mapUserResponse } from '../common/dto/user-response.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const users = await this.prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { userRoles: { include: { role: true } } },
    });
    return users.map((u) => mapUserResponse(u));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: { include: { rolePermissions: { include: { permission: true } } } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return mapUserResponse(user);
  }

  async create(dto: any, actorId?: number) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: dto.status ?? UserStatus.ACTIVE,
      },
    });
    if (dto.roleIds?.length) {
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId: number) => ({ userId: user.id, roleId })),
        skipDuplicates: true,
      });
    }
    await this.prisma.securityEvent.create({
      data: {
        userId: actorId,
        eventType: EventType.USER_CREATED,
        severity: Severity.LOW,
        entityType: 'User',
        entityId: String(user.id),
        description: `User created ${user.email}`,
      },
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
    await this.prisma.user.update({ where: { id }, data });
    if (dto.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId: number) => ({ userId: id, roleId })),
      });
    }
    await this.prisma.securityEvent.create({
      data: {
        userId: actorId,
        eventType: EventType.USER_UPDATED,
        severity: Severity.LOW,
        entityType: 'User',
        entityId: String(id),
        description: `User updated ${id}`,
      },
    });
    return this.findOne(id);
  }

  async updateStatus(id: number, status: UserStatus, actorId?: number) {
    await this.findOne(id);
    const user = await this.prisma.user.update({ where: { id }, data: { status } });
    await this.prisma.securityEvent.create({
      data: {
        userId: actorId,
        eventType: status === UserStatus.BLOCKED ? EventType.USER_BLOCKED : EventType.USER_UPDATED,
        severity: status === UserStatus.BLOCKED ? Severity.HIGH : Severity.MEDIUM,
        entityType: 'User',
        entityId: String(id),
        description: `User status changed to ${status}`,
      },
    });
    return mapUserResponse(user);
  }

  async disable(id: number, actorId?: number) {
    return this.updateStatus(id, UserStatus.DISABLED, actorId);
  }

  async assignRoles(id: number, roleIds: number[], actorId?: number) {
    await this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId: id, roleId })),
      skipDuplicates: true,
    });
    await this.prisma.securityEvent.create({
      data: {
        userId: actorId,
        eventType: EventType.ROLE_ASSIGNED,
        severity: Severity.MEDIUM,
        entityType: 'User',
        entityId: String(id),
        description: `Roles assigned to user ${id}`,
      },
    });
    return this.findOne(id);
  }

  async removeRole(userId: number, roleId: number, actorId?: number) {
    await this.prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
    await this.prisma.securityEvent.create({
      data: {
        userId: actorId,
        eventType: EventType.ROLE_REMOVED,
        severity: Severity.MEDIUM,
        entityType: 'User',
        entityId: String(userId),
        description: `Role ${roleId} removed`,
      },
    });
    return { success: true };
  }
}
