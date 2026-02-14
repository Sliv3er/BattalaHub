import { Controller, Get, Post, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Voice')
@Controller('voice')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Get('ice-servers')
  @ApiOperation({ summary: 'Get ICE servers configuration for WebRTC' })
  @ApiResponse({ status: 200, description: 'ICE servers configuration' })
  getIceServers() {
    return this.voiceService.getIceServers();
  }

  @Post('channels/:channelId/join')
  @ApiOperation({ summary: 'Join a voice channel' })
  @ApiResponse({ status: 201, description: 'Joined voice channel successfully' })
  joinVoiceChannel(@Param('channelId') channelId: string, @Request() req) {
    return this.voiceService.joinVoiceChannel(channelId, req.user.id);
  }

  @Delete('leave')
  @ApiOperation({ summary: 'Leave current voice channel' })
  @ApiResponse({ status: 200, description: 'Left voice channel successfully' })
  leaveVoiceChannel(@Request() req) {
    return this.voiceService.leaveVoiceChannel(req.user.id);
  }

  @Get('channels/:channelId/users')
  @ApiOperation({ summary: 'Get users in a voice channel' })
  @ApiResponse({ status: 200, description: 'Voice channel users retrieved' })
  getVoiceChannelUsers(@Param('channelId') channelId: string) {
    return this.voiceService.getVoiceChannelUsers(channelId);
  }
}