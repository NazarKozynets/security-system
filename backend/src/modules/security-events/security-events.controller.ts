import {Controller, Get, Param, ParseIntPipe, Query} from '@nestjs/common';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {EventType, Severity} from '@prisma/client';
import {RequirePermissions} from '../../common/decorators/permissions.decorator';
import {SecurityEventsService} from './security-events.service';

@ApiTags('Security Events')
@ApiBearerAuth()
@Controller('security-events')
export class SecurityEventsController {
    constructor(private readonly service: SecurityEventsService) {
    }

    @Get() // Find all security events with pagination
    @RequirePermissions('security.log.read')
    findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('eventType') eventType?: EventType,
        @Query('severity') severity?: Severity,
    ) {
        return this.service.findAll({
            page: Number(page),
            limit: Number(limit),
            eventType,
            severity,
        });
    }

    @Get(':id') // Find a single security event by ID
    @RequirePermissions('security.log.read')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }
}
