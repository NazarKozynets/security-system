import { Global, Module } from '@nestjs/common';
import { SecurityAuditLogger } from './security-audit-logger.service';
import { WinstonLoggerService } from './winston-logger.service';

@Global()
@Module({
  providers: [WinstonLoggerService, SecurityAuditLogger],
  exports: [WinstonLoggerService, SecurityAuditLogger],
})
export class LoggerIntegrationModule {}
