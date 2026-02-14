import { Module } from '@nestjs/common';
import { EmojisController } from './emojis.controller';
import { EmojisService } from './emojis.service';
import { StorageModule } from '../storage/storage.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [StorageModule, DatabaseModule],
  controllers: [EmojisController],
  providers: [EmojisService],
})
export class EmojisModule {}
