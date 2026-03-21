import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('login-attempts')
  @RequirePermissions('security.report.read')
  loginAttempts(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
    @Query('success') success?: string,
  ) {
    return this.reportsService.loginAttempts({
      from,
      to,
      userId: userId ? Number(userId) : undefined,
      success,
    });
  }

  @Get('security-events')
  @RequirePermissions('security.report.read')
  securityEvents(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('eventType') eventType?: string,
    @Query('severity') severity?: string,
  ) {
    return this.reportsService.securityEvents({ from, to, eventType, severity });
  }

  @Get('suspicious-activity')
  @RequirePermissions('security.report.read')
  suspicious() { return this.reportsService.suspiciousActivity(); }

  @Get('user-access/:id')
  @RequirePermissions('security.report.read')
  userAccess(@Param('id', ParseIntPipe) id: number) { return this.reportsService.userAccess(id); }

  @Get('dashboard')
  @RequirePermissions('security.report.read')
  dashboard() { return this.reportsService.dashboard(); }
}
