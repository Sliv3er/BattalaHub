import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async create(createChannelDto: CreateChannelDto, serverId: string, userId: string) {
    // Check if user is a member of the server
    const member = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You must be a member of the server to create channels');
    }

    // Get the highest position for ordering
    const lastChannel = await this.prisma.channel.findFirst({
      where: { serverId },
      orderBy: { position: 'desc' },
    });

    const position = lastChannel ? lastChannel.position + 1 : 0;

    return this.prisma.channel.create({
      data: {
        ...createChannelDto,
        serverId,
        position,
      },
    });
  }

  async findAll(serverId: string, userId: string) {
    // Check if user is a member of the server
    const member = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You must be a member of the server to view channels');
    }

    return this.prisma.channel.findMany({
      where: { serverId },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: {
            messages: true,
            voiceSessions: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        server: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.server.members.length === 0) {
      throw new ForbiddenException('You must be a member of the server to access this channel');
    }

    return channel;
  }

  async update(id: string, updateChannelDto: UpdateChannelDto, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        server: true,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Check if user is the server owner (only owners can update channels for now)
    if (channel.server.ownerId !== userId) {
      throw new ForbiddenException('Only server owner can update channels');
    }

    return this.prisma.channel.update({
      where: { id },
      data: updateChannelDto,
    });
  }

  async remove(id: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        server: true,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Check if user is the server owner
    if (channel.server.ownerId !== userId) {
      throw new ForbiddenException('Only server owner can delete channels');
    }

    // Prevent deletion of the last channel
    const channelCount = await this.prisma.channel.count({
      where: { serverId: channel.serverId },
    });

    if (channelCount <= 1) {
      throw new ForbiddenException('Cannot delete the last channel in a server');
    }

    return this.prisma.channel.delete({
      where: { id },
    });
  }

  async getChannelMembers(channelId: string, userId: string) {
    const channel = await this.findOne(channelId, userId);

    return this.prisma.serverMember.findMany({
      where: {
        serverId: channel.serverId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isOnline: true,
          },
        },
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        user: {
          displayName: 'asc',
        },
      },
    });
  }
}