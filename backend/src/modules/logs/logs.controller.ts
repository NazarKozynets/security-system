import {Controller, Get, Param, Query} from '@nestjs/common';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {RequirePermissions} from '../../common/decorators/permissions.decorator';
import {LogsService} from './logs.service';

@ApiTags('System logs')
@ApiBearerAuth()
@Controller('logs')
export class LogsController {
    constructor(private readonly logsService: LogsService) {
    }

    @Get('files') // Find all log files
    @RequirePermissions('security.log.read')
    listFiles(): Promise<{ name: string; size: number }[]> {
        return this.logsService.listFiles();
    }

    @Get('files/:name') // Find specific log file by name
    @RequirePermissions('security.log.read')
    readFile(
        @Param('name') name: string,
        @Query('offset') offset?: string,
        @Query('limit') limit?: string,
        @Query('level') level?: string,
    ): Promise<{
        lines: string[];
        totalLines: number;
        offset: number;
        limit: number;
    }> {
        return this.logsService.readLogFile(
            name,
            offset ? Number(offset) : 0,
            limit ? Number(limit) : undefined,
            level,
        );
    }
}
