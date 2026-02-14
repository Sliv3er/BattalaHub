import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class VoiceService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getIceServers() {
    return {
      iceServers: [
        {
          urls: ['stun:stun.l.google.com:19302'],
        },
        {
          urls: [this.configService.get('TURN_SERVER_URL', 'turn:localhost:3478')],
          username: this.configService.get('TURN_SERVER_USERNAME', 'battala'),
          credential: this.configService.get('TURN_SERVER_CREDENTIAL', 'battala123'),
        },
      ],
    };
  }

  async joinVoiceChannel(channelId: string, userId: string) {
    // End any existing voice sessions
    await this.prisma.voiceSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    // Create new voice session
    const session = await this.prisma.voiceSession.create({
      data: {
        userId,
        channelId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return session;
  }

  async leaveVoiceChannel(userId: string) {
    await this.prisma.voiceSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    return { success: true };
  }

  async getVoiceChannelUsers(channelId: string) {
    return this.prisma.voiceSession.findMany({
      where: {
        channelId,
        isActive: true,
      },
      include: {
        user: {
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
}