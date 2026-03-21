import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { IsArray, IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { UsersService } from './users.service';

class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @IsArray() @IsInt({ each: true }) roleIds?: number[];
}
class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @IsArray() @IsInt({ each: true }) roleIds?: number[];
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('user.read')
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.usersService.findAll(Number(page), Number(limit));
  }

  @Get(':id')
  @RequirePermissions('user.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('user.create')
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: { id: number }) {
    return this.usersService.create(dto, actor.id);
  }

  @Patch(':id')
  @RequirePermissions('user.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser() actor: { id: number }) {
    return this.usersService.update(id, dto, actor.id);
  }

  @Patch(':id/status')
  @RequirePermissions('user.update')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: UserStatus, @CurrentUser() actor: { id: number }) {
    return this.usersService.updateStatus(id, status, actor.id);
  }

  @Delete(':id')
  @RequirePermissions('user.delete')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: { id: number }) {
    return this.usersService.disable(id, actor.id);
  }

  @Post(':id/roles')
  @RequirePermissions('role.assign')
  assignRoles(@Param('id', ParseIntPipe) id: number, @Body('roleIds') roleIds: number[], @CurrentUser() actor: { id: number }) {
    return this.usersService.assignRoles(id, roleIds, actor.id);
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions('role.assign')
  removeRole(@Param('id', ParseIntPipe) id: number, @Param('roleId', ParseIntPipe) roleId: number, @CurrentUser() actor: { id: number }) {
    return this.usersService.removeRole(id, roleId, actor.id);
  }
}
