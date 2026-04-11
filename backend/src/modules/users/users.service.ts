import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {EventType, Severity, UserStatus} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {mapUserResponse, UserResponseDto} from '../../common/dto/user-response.dto';
import {PrismaService} from '../../database/prisma/prisma.service';
import {SecurityAuditLogger} from '../../integrations/logger/security-audit-logger.service';
import {SecurityEventRepository} from '../../repositories/security-event.repository';
import {UserRepository} from '../../repositories/user.repository';
import {UserRoleRepository} from '../../repositories/user-role.repository';
import {UserWithRbac} from "../../repositories/user-rbac.types";

// Interface for UsersService
interface IUsersService {
    // Find all users and paginate them
    findAll(page: number, limit: number): Promise<UserResponseDto[]>;

    // Find specific user (by id)
    findOne(id: number): Promise<UserResponseDto>;

    // Create new user
    create(dto: any, actorId?: number): Promise<UserResponseDto>;

    // Update user's fields
    update(id: number, dto: any, actorId?: number): Promise<UserResponseDto>;

    // Updating user's status
    updateStatus(id: number, status: UserStatus, actorId?: number): Promise<UserResponseDto>;

    // Disable user
    disable(id: number, actorId?: number): Promise<UserResponseDto>;

    // Assign new roles to user
    assignRoles(id: number, roleIds: number[], actorId?: number): Promise<UserResponseDto>;

    // Remove user's role
    removeRole(userId: number, roleId: number, actorId?: number): Promise<{success: boolean}>
}

@Injectable()
export class UsersService implements IUsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly userRepository: UserRepository,
        private readonly userRoleRepository: UserRoleRepository,
        private readonly securityEventRepository: SecurityEventRepository,
        private readonly audit: SecurityAuditLogger,
    ) {
    }

    // Find all users and paginate them
    async findAll(page = 1, limit = 20): Promise<UserResponseDto[]> {
        const users: UserWithRbac[] = await this.userRepository.findAllPaginated(page, limit);
        return users.map((u: UserWithRbac): UserResponseDto => mapUserResponse(u));
    }

    // Find specific user (by id)
    async findOne(id: number): Promise<UserResponseDto> {
        const user: UserWithRbac | null = await this.userRepository.findByIdWithRbac(id);
        if (!user) throw new NotFoundException('User not found');
        return mapUserResponse(user);
    }

    // Create new user
    async create(dto: any, actorId?: number): Promise<UserResponseDto> {
        // Creating password hash
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // Starting transaction
        const user = await this.prisma.client.$transaction(async (tx) => {
            // Creating user in User model
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

            // Inserting a new user-role pair
            if (dto.roleIds?.length) {
                await this.userRoleRepository.insertMany(
                    dto.roleIds.map((roleId: number) => ({
                        userId: created.id,
                        roleId,
                    })),
                    tx,
                );
            }

            // Creating a new security event
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

            // Getting user with RBAC
            return this.userRepository.findByIdWithRbac(created.id, tx);
        });

        if (!user) throw new Error('User not found after create');

        // Saving log about registering new user
        this.audit.roleOrPermissionChange('USER_CREATED', {
            userId: actorId,
            target: user.email,
            details: `created user id=${user.id}`,
        });

        return mapUserResponse(user);
    }

    // Update user's fields
    async update(id: number, dto: any, actorId?: number): Promise<UserResponseDto> {
        const data: any = {...dto};

        // Check if data invalid
        if (!data) throw new BadRequestException("Invalid data");

        // Checking if user exists
        await this.findOne(id);

        if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);
        if (dto.email) data.email = dto.email.toLowerCase().trim();
        delete data.password;
        delete data.roleIds;

        // Starting transaction
        await this.prisma.client.$transaction(async (tx) => {
            // Updating user
            await this.userRepository.updateFields(id, data, tx);

            // Updating user-role pairs if there's a need
            if (dto.roleIds) {
                await this.userRoleRepository.deleteAllForUser(id, tx);
                await this.userRoleRepository.insertMany(
                    dto.roleIds.map((roleId: number) => ({userId: id, roleId})),
                    tx,
                );
            }

            // Creating a new security event
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

        // Saving log about updating user
        this.audit.roleOrPermissionChange('USER_UPDATED', {
            userId: actorId,
            target: String(id),
            details: 'user profile or roles updated',
        });

        return this.findOne(id);
    }

    // Updating user's status
    async updateStatus(id: number, status: UserStatus, actorId?: number): Promise<UserResponseDto> {
        await this.findOne(id);

        // Starting transaction
        const user = await this.prisma.client.$transaction(async (tx) => {
            // Updating user's status
            const updatedUser = await this.userRepository.updateStatus(id, status);

            // Creating a new security event
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

            return updatedUser;
        })

        if (!user) {
            throw new Error('User was not updated');
        }

        // Saving log about updating user's status
        this.audit.roleOrPermissionChange('USER_STATUS_CHANGED', {
            userId: actorId,
            target: String(id),
            details: `status=${status}`,
        });

        return mapUserResponse({...user, userRoles: []});
    }

    // Disable user
    async disable(id: number, actorId?: number): Promise<UserResponseDto> {
        return this.updateStatus(id, UserStatus.DISABLED, actorId);
    }

    // Assign new roles to user
    async assignRoles(id: number, roleIds: number[], actorId?: number): Promise<UserResponseDto> {
        // Starting transaction
        await this.prisma.client.$transaction(async (tx) => {
            // Inserting new user-role pairs
            await this.userRoleRepository.insertMany(
                roleIds.map((roleId) => ({userId: id, roleId})),
            );

            // Creating a new security event
            await this.securityEventRepository.create({
                userId: actorId,
                eventType: EventType.ROLE_ASSIGNED,
                severity: Severity.MEDIUM,
                entityType: 'User',
                entityId: String(id),
                description: `Roles assigned to user ${id}`,
            });
        })

        // Saving log about assigning new roles to user
        this.audit.roleOrPermissionChange('ROLE_ASSIGNED', {
            userId: actorId,
            target: String(id),
            details: `roleIds=${roleIds.join(',')}`,
        });

        return this.findOne(id);
    }

    // Remove user's role
    async removeRole(userId: number, roleId: number, actorId?: number): Promise<{success: boolean}> {
        // Starting transaction
        await this.prisma.client.$transaction(async (tx) => {
            // Deleting user-role pair
            await this.userRoleRepository.deletePair(userId, roleId);

            // Saving log about removing role from user
            await this.securityEventRepository.create({
                userId: actorId,
                eventType: EventType.ROLE_REMOVED,
                severity: Severity.MEDIUM,
                entityType: 'User',
                entityId: String(userId),
                description: `Role ${roleId} removed`,
            });
        })

        // Saving log about removing role from user
        this.audit.roleOrPermissionChange('ROLE_REMOVED', {
            userId: actorId,
            target: String(userId),
            details: `roleId=${roleId}`,
        });
        return {success: true};
    }
}
