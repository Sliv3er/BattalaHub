import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';

@Module({
  imports: [DatabaseModule, WebsocketModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
