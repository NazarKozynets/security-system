import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RolesService } from './roles.service';

class RoleDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}
class AssignPermissionsDto {
  @IsArray() permissionIds!: number[];
}

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}
  @Get()
  @RequirePermissions('role.read')
  findAll() {
    return this.rolesService.findAll();
  }
  @Post()
  @RequirePermissions('role.manage')
  create(@Body() dto: RoleDto) {
    return this.rolesService.create(dto);
  }
  @Patch(':id')
  @RequirePermissions('role.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: RoleDto) {
    return this.rolesService.update(id, dto);
  }
  @Delete(':id')
  @RequirePermissions('role.manage')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }
  @Post(':id/permissions')
  @RequirePermissions('permission.manage')
  assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser() actor: { id: number },
  ) {
    return this.rolesService.assignPermissions(id, dto.permissionIds, actor.id);
  }
  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('permission.manage')
  removePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.rolesService.removePermission(id, permissionId);
  }
}
