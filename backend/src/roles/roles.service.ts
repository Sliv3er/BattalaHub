import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  private async checkManageRoles(serverId: string, userId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.ownerId === userId) return;

    const member = await this.prisma.serverMember.findUnique({
      where: { userId_serverId: { userId, serverId } },
      include: { roles: { include: { role: true } } },
    });
    if (!member) throw new ForbiddenException('Not a member');

    const hasPermission = member.roles.some(
      mr => mr.role.permissions.includes('ADMINISTRATOR') || mr.role.permissions.includes('MANAGE_ROLES'),
    );
    if (!hasPermission) throw new ForbiddenException('Missing MANAGE_ROLES permission');
  }

  async createRole(serverId: string, data: CreateRoleDto, userId: string) {
    await this.checkManageRoles(serverId, userId);
    const maxPos = await this.prisma.role.aggregate({ where: { serverId }, _max: { position: true } });
    return this.prisma.role.create({
      data: {
        name: data.name,
        color: data.color || '#ffffff',
        permissions: data.permissions || [],
        serverId,
        position: (maxPos._max.position ?? 0) + 1,
      },
    });
  }

  async updateRole(roleId: string, data: UpdateRoleDto, userId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    await this.checkManageRoles(role.serverId, userId);
    return this.prisma.role.update({ where: { id: roleId }, data });
  }

  async deleteRole(roleId: string, userId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isDefault) throw new BadRequestException('Cannot delete @everyone role');
    await this.checkManageRoles(role.serverId, userId);
    return this.prisma.role.delete({ where: { id: roleId } });
  }

  async getRoles(serverId: string) {
    return this.prisma.role.findMany({
      where: { serverId },
      orderBy: { position: 'desc' },
      include: { _count: { select: { members: true } } },
    });
  }

  async assignRole(memberId: string, roleId: string, userId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    await this.checkManageRoles(role.serverId, userId);
    const member = await this.prisma.serverMember.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.memberRole.create({
      data: { memberId, roleId },
      include: { role: true },
    });
  }

  async removeRole(memberId: string, roleId: string, userId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    await this.checkManageRoles(role.serverId, userId);
    return this.prisma.memberRole.delete({
      where: { memberId_roleId: { memberId, roleId } },
    });
  }
}
