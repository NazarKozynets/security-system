import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('export/login-attempts.csv')
  @RequirePermissions('security.report.read')
  async exportLoginAttemptsCsv(
    @Res() res: Response,
    @CurrentUser() user: { id: number },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
    @Query('success') success?: string,
  ) {
    const csv = await this.reportsService.loginAttemptsCsv(
      {
        from,
        to,
        userId: userId ? Number(userId) : undefined,
        success,
      },
      user.id,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="login-attempts.csv"',
    );
    return res.send(csv);
  }

  @Get('export/security-events.csv')
  @RequirePermissions('security.report.read')
  async exportSecurityEventsCsv(
    @Res() res: Response,
    @CurrentUser() user: { id: number },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('eventType') eventType?: string,
    @Query('severity') severity?: string,
  ) {
    const csv = await this.reportsService.securityEventsCsv(
      { from, to, eventType, severity },
      user.id,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="security-events.csv"',
    );
    return res.send(csv);
  }

  @Get('export/summary.pdf')
  @RequirePermissions('security.report.read')
  async exportSummaryPdf(
    @Res() res: Response,
    @CurrentUser() user: { id: number },
  ) {
    const buf = await this.reportsService.summaryPdf(user.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="security-summary.pdf"',
    );
    return res.send(buf);
  }

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
    return this.reportsService.securityEvents({
      from,
      to,
      eventType,
      severity,
    });
  }

  @Get('suspicious-activity')
  @RequirePermissions('security.report.read')
  suspicious() {
    return this.reportsService.suspiciousActivity();
  }

  @Get('user-access/:id')
  @RequirePermissions('security.report.read')
  userAccess(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.userAccess(id);
  }

  @Get('dashboard')
  @RequirePermissions('security.report.read')
  dashboard() {
    return this.reportsService.dashboard();
  }
}
