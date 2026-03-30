import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { PrismaModule } from './database/prisma/prisma.module';
import { LoggerIntegrationModule } from './integrations/logger/logger.module';
import { AuthModule } from './modules/auth/auth.module';
import { LoginAttemptsModule } from './modules/login-attempts/login-attempts.module';
import { LogsModule } from './modules/logs/logs.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RolesModule } from './modules/roles/roles.module';
import { SecurityEventsModule } from './modules/security-events/security-events.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerIntegrationModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    SecurityEventsModule,
    LoginAttemptsModule,
    ReportsModule,
    LogsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
