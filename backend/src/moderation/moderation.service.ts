import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VoiceGateway } from '../websocket/voice.gateway';

@Injectable()
export class ModerationService {
  constructor(
    private prisma: PrismaService,
    private voiceGateway: VoiceGateway,
  ) {}

  private async checkPermission(serverId: string, actorId: string, permission: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.ownerId === actorId) return;

    const member = await this.prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: actorId, serverId } },
      include: { roles: { include: { role: true } } },
    });
    if (!member) throw new ForbiddenException('Not a member');

    const has = member.roles.some(
      mr => mr.role.permissions.includes('ADMINISTRATOR') || mr.role.permissions.includes(permission),
    );
    if (!has) throw new ForbiddenException(`Missing ${permission} permission`);
  }

  async serverMuteUser(serverId: string, targetUserId: string, actorId: string) {
    await this.checkPermission(serverId, actorId, 'MUTE_MEMBERS');
    this.voiceGateway.server.emit('server_mute', { userId: targetUserId, serverId });
    return { success: true };
  }

  async serverDeafenUser(serverId: string, targetUserId: string, actorId: string) {
    await this.checkPermission(serverId, actorId, 'DEAFEN_MEMBERS');
    this.voiceGateway.server.emit('server_deafen', { userId: targetUserId, serverId });
    return { success: true };
  }

  async disconnectUser(serverId: string, targetUserId: string, actorId: string) {
    await this.checkPermission(serverId, actorId, 'MOVE_MEMBERS');
    // Find active voice session
    const session = await this.prisma.voiceSession.findFirst({
      where: { userId: targetUserId, isActive: true, channel: { serverId } },
    });
    if (session) {
      this.voiceGateway.forceDisconnectUser(targetUserId, session.channelId);
      await this.prisma.voiceSession.update({ where: { id: session.id }, data: { isActive: false, leftAt: new Date() } });
    }
    return { success: true };
  }

  async kickUser(serverId: string, targetUserId: string, actorId: string) {
    await this.checkPermission(serverId, actorId, 'KICK_MEMBERS');
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (server?.ownerId === targetUserId) throw new ForbiddenException('Cannot kick the server owner');

    // Disconnect from voice if connected
    const session = await this.prisma.voiceSession.findFirst({
      where: { userId: targetUserId, isActive: true, channel: { serverId } },
    });
    if (session) {
      this.voiceGateway.forceDisconnectUser(targetUserId, session.channelId);
      await this.prisma.voiceSession.update({ where: { id: session.id }, data: { isActive: false, leftAt: new Date() } });
    }

    await this.prisma.serverMember.delete({
      where: { userId_serverId: { userId: targetUserId, serverId } },
    });
    return { success: true };
  }
}
