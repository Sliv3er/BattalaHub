import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async create(createMessageDto: CreateMessageDto, channelId: string, userId: string) {
    // Verify user has access to the channel
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        server: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    if (!channel) {
      throw new ForbiddenException('You do not have access to this channel');
    }

    const message = await this.prisma.message.create({
      data: {
        content: createMessageDto.content,
        authorId: userId,
        channelId,
        type: createMessageDto.type || 'USER',
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isOnline: true,
          },
        },
        reactions: {
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
        },
        attachments: true,
      },
    });

    return message;
  }

  async findAll(channelId: string, userId: string, take = 50, skip = 0) {
    // Verify user has access to the channel
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        server: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    if (!channel) {
      throw new ForbiddenException('You do not have access to this channel');
    }

    const messages = await this.prisma.message.findMany({
      where: { channelId },
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isOnline: true,
          },
        },
        reactions: {
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
        },
        attachments: true,
      },
    });

    return messages.reverse(); // Return in chronological order
  }

  async findOne(id: string, userId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id,
        channel: {
          server: {
            members: {
              some: {
                userId,
              },
            },
          },
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isOnline: true,
          },
        },
        reactions: {
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
        },
        attachments: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async update(id: string, updateMessageDto: UpdateMessageDto, userId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id,
        authorId: userId,
      },
    });

    if (!message) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Check if message is older than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (message.createdAt < tenMinutesAgo) {
      throw new ForbiddenException('Messages older than 10 minutes cannot be edited');
    }

    return this.prisma.message.update({
      where: { id },
      data: {
        content: updateMessageDto.content,
        editedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isOnline: true,
          },
        },
        reactions: {
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
        },
        attachments: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id,
        OR: [
          { authorId: userId },
          {
            channel: {
              server: {
                ownerId: userId,
              },
            },
          },
        ],
      },
    });

    if (!message) {
      throw new ForbiddenException('You can only delete your own messages or messages in your server');
    }

    return this.prisma.message.delete({
      where: { id },
    });
  }

  async addReaction(messageId: string, addReactionDto: AddReactionDto, userId: string) {
    // Verify user has access to the message
    const message = await this.findOne(messageId, userId);

    const existingReaction = await this.prisma.reaction.findUnique({
      where: {
        userId_messageId_emoji: {
          userId,
          messageId,
          emoji: addReactionDto.emoji,
        },
      },
    });

    if (existingReaction) {
      // Remove reaction if it already exists (toggle)
      await this.prisma.reaction.delete({
        where: {
          userId_messageId_emoji: {
            userId,
            messageId,
            emoji: addReactionDto.emoji,
          },
        },
      });
      return { action: 'removed' };
    } else {
      // Add new reaction
      await this.prisma.reaction.create({
        data: {
          emoji: addReactionDto.emoji,
          userId,
          messageId,
        },
      });
      return { action: 'added' };
    }
  }

  async startTyping(channelId: string, userId: string) {
    // Check if user has access to channel
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        server: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    if (!channel) {
      throw new ForbiddenException('You do not have access to this channel');
    }

    // Upsert typing indicator
    await this.prisma.typingIndicator.upsert({
      where: {
        userId_channelId: {
          userId,
          channelId,
        },
      },
      update: {
        startedAt: new Date(),
      },
      create: {
        userId,
        channelId,
        startedAt: new Date(),
      },
    });

    return { success: true };
  }

  async stopTyping(channelId: string, userId: string) {
    await this.prisma.typingIndicator.deleteMany({
      where: {
        userId,
        channelId,
      },
    });

    return { success: true };
  }

  async getTypingUsers(channelId: string, userId: string) {
    // Check access
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        server: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    if (!channel) {
      throw new ForbiddenException('You do not have access to this channel');
    }

    // Get typing indicators from the last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);

    return this.prisma.typingIndicator.findMany({
      where: {
        channelId,
        startedAt: {
          gte: tenSecondsAgo,
        },
        userId: {
          not: userId, // Don't include current user
        },
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