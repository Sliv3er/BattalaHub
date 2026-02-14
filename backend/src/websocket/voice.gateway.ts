import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { VoiceService } from '../voice/voice.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';

@WebSocketGateway({
  namespace: '/voice',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class VoiceGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private voiceService: VoiceService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  @SubscribeMessage('join_voice')
  async handleJoinVoice(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    try {
      const userId = client.data.user?.id;
      if (!userId) return;

      const session = await this.voiceService.joinVoiceChannel(data.channelId, userId);
      
      client.join(`voice:${data.channelId}`);
      
      // Notify others in the voice channel
      client.to(`voice:${data.channelId}`).emit('user_joined_voice', {
        user: session.user,
        channelId: data.channelId,
      });

      // Send back ice servers configuration
      const iceServers = await this.voiceService.getIceServers();
      client.emit('ice_servers', iceServers);

      console.log(`🎤 User ${session.user.username} joined voice channel`);
    } catch (error) {
      client.emit('error', { message: error.message });
      console.error('Join voice error:', error);
    }
  }

  @SubscribeMessage('leave_voice')
  async handleLeaveVoice(@ConnectedSocket() client: Socket) {
    try {
      const userId = client.data.user?.id;
      if (!userId) return;

      await this.voiceService.leaveVoiceChannel(userId);
      
      // Leave all voice rooms
      const rooms = Array.from(client.rooms).filter((room: string) => room.startsWith('voice:'));
      rooms.forEach((room: string) => {
        client.leave(room);
        const channelId = room.replace('voice:', '');
        client.to(room).emit('user_left_voice', {
          userId,
          channelId,
        });
      });

      console.log(`🎤 User left voice channel`);
    } catch (error) {
      console.error('Leave voice error:', error);
    }
  }

  @SubscribeMessage('webrtc_offer')
  handleWebRTCOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { offer: RTCSessionDescriptionInit; targetUserId: string; channelId: string },
  ) {
    client.to(`voice:${data.channelId}`).emit('webrtc_offer', {
      offer: data.offer,
      fromUserId: client.data.user.id,
      targetUserId: data.targetUserId,
    });
  }

  @SubscribeMessage('webrtc_answer')
  handleWebRTCAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { answer: RTCSessionDescriptionInit; targetUserId: string; channelId: string },
  ) {
    client.to(`voice:${data.channelId}`).emit('webrtc_answer', {
      answer: data.answer,
      fromUserId: client.data.user.id,
      targetUserId: data.targetUserId,
    });
  }

  @SubscribeMessage('voice_state_update')
  handleVoiceStateUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; isMuted: boolean; isDeafened: boolean; isScreenSharing: boolean },
  ) {
    client.to(`voice:${data.channelId}`).emit('voice_state_update', {
      userId: client.data.user.id,
      ...data,
    });
  }

  @SubscribeMessage('webrtc_ice_candidate')
  handleWebRTCIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { candidate: RTCIceCandidateInit; targetUserId: string; channelId: string },
  ) {
    client.to(`voice:${data.channelId}`).emit('webrtc_ice_candidate', {
      candidate: data.candidate,
      fromUserId: client.data.user.id,
      targetUserId: data.targetUserId,
    });
  }
}