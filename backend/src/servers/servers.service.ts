import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ServersService {
  constructor(private prisma: PrismaService) {}

  async create(createServerDto: CreateServerDto, ownerId: string) {
    const server = await this.prisma.server.create({
      data: {
        ...createServerDto,
        ownerId,
        members: {
          create: {
            userId: ownerId,
          },
        },
        roles: {
          create: {
            name: '@everyone',
            color: '#ffffff',
            permissions: ['READ_MESSAGES', 'SEND_MESSAGES'],
            isDefault: true,
            position: 0,
          },
        },
        channels: {
          create: {
            name: 'general',
            type: 'TEXT',
            position: 0,
          },
        },
      },
      include: {
        members: {
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
          },
        },
        channels: true,
        roles: true,
      },
    });

    return server;
  }

  async findAll(userId: string) {
    return this.prisma.server.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
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
          },
        },
        channels: {
          orderBy: {
            position: 'asc',
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const server = await this.prisma.server.findFirst({
      where: {
        id,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
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
        },
        channels: {
          orderBy: {
            position: 'asc',
          },
        },
        roles: {
          orderBy: {
            position: 'desc',
          },
        },
      },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    return server;
  }

  async update(id: string, updateServerDto: UpdateServerDto, userId: string) {
    const server = await this.prisma.server.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!server) {
      throw new ForbiddenException('You can only update servers you own');
    }

    return this.prisma.server.update({
      where: { id },
      data: updateServerDto,
    });
  }

  async remove(id: string, userId: string) {
    const server = await this.prisma.server.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!server) {
      throw new ForbiddenException('You can only delete servers you own');
    }

    return this.prisma.server.delete({
      where: { id },
    });
  }

  async joinServer(serverId: string, userId: string) {
    const existingMember = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('You are already a member of this server');
    }

    return this.prisma.serverMember.create({
      data: {
        userId,
        serverId,
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
      },
    });
  }

  async leaveServer(serverId: string, userId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId === userId) {
      throw new BadRequestException('Server owner cannot leave the server');
    }

    const member = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId,
        },
      },
    });

    if (!member) {
      throw new BadRequestException('You are not a member of this server');
    }

    return this.prisma.serverMember.delete({
      where: {
        userId_serverId: {
          userId,
          serverId,
        },
      },
    });
  }

  async getInvites(serverId: string, userId: string) {
    const member = await this.prisma.serverMember.findUnique({
      where: { userId_serverId: { userId, serverId } },
    });
    if (!member) throw new ForbiddenException('You are not a member of this server');
    return this.prisma.invite.findMany({
      where: { serverId },
      include: { creator: { select: { id: true, username: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInvite(serverId: string, createInviteDto: CreateInviteDto, userId: string) {
    const member = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    const code = uuidv4().slice(0, 8);

    return this.prisma.invite.create({
      data: {
        code,
        serverId,
        creatorId: userId,
        maxUses: createInviteDto.maxUses,
        expiresAt: createInviteDto.expiresAt,
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async joinByInvite(inviteCode: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { code: inviteCode },
      include: {
        server: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite code');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite has expired');
    }

    if (invite.maxUses && invite.uses >= invite.maxUses) {
      throw new BadRequestException('Invite has reached maximum uses');
    }

    const existingMember = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId: invite.serverId,
        },
      },
    });

    if (existingMember) {
      return { server: invite.server, message: 'You are already a member of this server' };
    }

    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { uses: invite.uses + 1 },
    });

    await this.prisma.serverMember.create({
      data: {
        userId,
        serverId: invite.serverId,
      },
    });

    return { server: invite.server, message: 'Successfully joined server' };
  }
}