import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LoginAttemptsService } from './login-attempts.service';

@ApiTags('Login Attempts')
@ApiBearerAuth()
@Controller('login-attempts')
export class LoginAttemptsController {
  constructor(private readonly service: LoginAttemptsService) {}

  @Get() // Get all login attempts
  @RequirePermissions('security.log.read')
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.findAll(Number(page), Number(limit));
  }

  @Get(':id') // Get a single login attempt by ID
  @RequirePermissions('security.log.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
