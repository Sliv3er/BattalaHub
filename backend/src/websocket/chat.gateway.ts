import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from '../messages/messages.service';
import { PrismaService } from '../database/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Socket>();

  constructor(
    private messagesService: MessagesService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.data.user = user;
      this.userSockets.set(user.id, client);

      // Update user online status
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeen: new Date() },
      });

      // Join user to their server rooms
      const servers = await this.prisma.server.findMany({
        where: {
          members: {
            some: { userId: user.id },
          },
        },
        select: { id: true },
      });

      for (const server of servers) {
        client.join(`server:${server.id}`);
      }

      console.log(`👤 User ${user.username} connected`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.user) {
      const userId = client.data.user.id;
      this.userSockets.delete(userId);

      // Update user offline status
      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      });

      console.log(`👤 User ${client.data.user.username} disconnected`);
    }
  }

  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    try {
      const userId = client.data.user.id;
      const channel = await this.prisma.channel.findFirst({
        where: {
          id: data.channelId,
          server: {
            members: {
              some: { userId },
            },
          },
        },
      });

      if (channel) {
        client.join(`channel:${data.channelId}`);
        console.log(`📺 User ${client.data.user.username} joined channel ${channel.name}`);
      }
    } catch (error) {
      console.error('Join channel error:', error);
    }
  }

  @SubscribeMessage('leave_channel')
  handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    client.leave(`channel:${data.channelId}`);
    console.log(`📺 User ${client.data.user.username} left channel`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; content: string },
  ) {
    try {
      const userId = client.data.user.id;
      
      const message = await this.messagesService.create(
        { content: data.content },
        data.channelId,
        userId,
      );

      // Broadcast to channel
      this.server.to(`channel:${data.channelId}`).emit('new_message', message);
      
      console.log(`💬 Message sent by ${client.data.user.username} in channel ${data.channelId}`);
    } catch (error) {
      client.emit('error', { message: error.message });
      console.error('Send message error:', error);
    }
  }

  @SubscribeMessage('edit_message')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    try {
      const userId = client.data.user.id;
      
      const message = await this.messagesService.update(
        data.messageId,
        { content: data.content },
        userId,
      );

      const channel = await this.prisma.channel.findUnique({
        where: { id: message.channelId },
      });

      if (channel) {
        this.server.to(`channel:${message.channelId}`).emit('message_updated', message);
      }
      
      console.log(`✏️ Message edited by ${client.data.user.username}`);
    } catch (error) {
      client.emit('error', { message: error.message });
      console.error('Edit message error:', error);
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    try {
      const userId = client.data.user.id;
      
      const message = await this.prisma.message.findUnique({
        where: { id: data.messageId },
        select: { channelId: true },
      });

      await this.messagesService.remove(data.messageId, userId);

      if (message) {
        this.server.to(`channel:${message.channelId}`).emit('message_deleted', {
          messageId: data.messageId,
        });
      }
      
      console.log(`🗑️ Message deleted by ${client.data.user.username}`);
    } catch (error) {
      client.emit('error', { message: error.message });
      console.error('Delete message error:', error);
    }
  }

  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    try {
      const userId = client.data.user.id;
      
      const result = await this.messagesService.addReaction(
        data.messageId,
        { emoji: data.emoji },
        userId,
      );

      const message = await this.prisma.message.findUnique({
        where: { id: data.messageId },
        select: { channelId: true },
      });

      if (message) {
        this.server.to(`channel:${message.channelId}`).emit('reaction_updated', {
          messageId: data.messageId,
          emoji: data.emoji,
          userId,
          action: result.action,
        });
      }
      
      console.log(`😀 Reaction ${result.action} by ${client.data.user.username}`);
    } catch (error) {
      client.emit('error', { message: error.message });
      console.error('Add reaction error:', error);
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    try {
      const userId = client.data.user.id;
      
      await this.messagesService.startTyping(data.channelId, userId);
      
      client.to(`channel:${data.channelId}`).emit('user_typing', {
        userId,
        user: client.data.user,
        channelId: data.channelId,
      });
    } catch (error) {
      console.error('Typing start error:', error);
    }
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    try {
      const userId = client.data.user.id;
      
      await this.messagesService.stopTyping(data.channelId, userId);
      
      client.to(`channel:${data.channelId}`).emit('user_stopped_typing', {
        userId,
        channelId: data.channelId,
      });
    } catch (error) {
      console.error('Typing stop error:', error);
    }
  }
}