import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post(':serverId')
  create(@Param('serverId') serverId: string, @Body() dto: CreateRoleDto, @Request() req) {
    return this.rolesService.createRole(serverId, dto, req.user.id);
  }

  @Get(':serverId')
  findAll(@Param('serverId') serverId: string) {
    return this.rolesService.getRoles(serverId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Request() req) {
    return this.rolesService.updateRole(id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.rolesService.deleteRole(id, req.user.id);
  }

  @Post(':roleId/assign/:memberId')
  assign(@Param('roleId') roleId: string, @Param('memberId') memberId: string, @Request() req) {
    return this.rolesService.assignRole(memberId, roleId, req.user.id);
  }

  @Delete(':roleId/assign/:memberId')
  unassign(@Param('roleId') roleId: string, @Param('memberId') memberId: string, @Request() req) {
    return this.rolesService.removeRole(memberId, roleId, req.user.id);
  }
}
