import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma/prisma.module';
import { LoginAttemptRepository } from './login-attempt.repository';
import { PermissionRepository } from './permission.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { RolePermissionRepository } from './role-permission.repository';
import { RoleRepository } from './role.repository';
import { SecurityEventRepository } from './security-event.repository';
import { SecurityReportRepository } from './security-report.repository';
import { UserRepository } from './user.repository';
import { UserRoleRepository } from './user-role.repository';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    RoleRepository,
    PermissionRepository,
    UserRoleRepository,
    RolePermissionRepository,
    LoginAttemptRepository,
    SecurityEventRepository,
    RefreshTokenRepository,
    SecurityReportRepository,
  ],
  exports: [
    UserRepository,
    RoleRepository,
    PermissionRepository,
    UserRoleRepository,
    RolePermissionRepository,
    LoginAttemptRepository,
    SecurityEventRepository,
    RefreshTokenRepository,
    SecurityReportRepository,
  ],
})
export class RepositoriesModule {}
