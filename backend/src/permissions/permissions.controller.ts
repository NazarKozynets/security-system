import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsService } from './permissions.service';

class PermissionDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}
  @Get()
  @RequirePermissions('permission.read')
  findAll() { return this.permissionsService.findAll(); }
  @Post()
  @RequirePermissions('permission.manage')
  create(@Body() dto: PermissionDto) { return this.permissionsService.create(dto); }
  @Patch(':id')
  @RequirePermissions('permission.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: PermissionDto) { return this.permissionsService.update(id, dto); }
  @Delete(':id')
  @RequirePermissions('permission.manage')
  remove(@Param('id', ParseIntPipe) id: number) { return this.permissionsService.remove(id); }
}
