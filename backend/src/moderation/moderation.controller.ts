import { Controller, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Moderation')
@Controller('moderation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post(':serverId/mute/:userId')
  mute(@Param('serverId') serverId: string, @Param('userId') userId: string, @Request() req) {
    return this.moderationService.serverMuteUser(serverId, userId, req.user.id);
  }

  @Post(':serverId/deafen/:userId')
  deafen(@Param('serverId') serverId: string, @Param('userId') userId: string, @Request() req) {
    return this.moderationService.serverDeafenUser(serverId, userId, req.user.id);
  }

  @Post(':serverId/disconnect/:userId')
  disconnect(@Param('serverId') serverId: string, @Param('userId') userId: string, @Request() req) {
    return this.moderationService.disconnectUser(serverId, userId, req.user.id);
  }

  @Post(':serverId/kick/:userId')
  kick(@Param('serverId') serverId: string, @Param('userId') userId: string, @Request() req) {
    return this.moderationService.kickUser(serverId, userId, req.user.id);
  }
}
