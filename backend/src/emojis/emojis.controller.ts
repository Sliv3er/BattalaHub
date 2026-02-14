import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmojisService } from './emojis.service';

@Controller('emojis')
@UseGuards(JwtAuthGuard)
export class EmojisController {
  constructor(private readonly emojisService: EmojisService) {}

  @Post(':serverId')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Param('serverId') serverId: string,
    @Body('name') name: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!name?.trim()) throw new BadRequestException('Name is required');
    return this.emojisService.create(serverId, name.trim(), file, req.user.id);
  }

  @Get(':serverId')
  findAll(@Param('serverId') serverId: string) {
    return this.emojisService.findAll(serverId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.emojisService.remove(id, req.user.id);
  }
}
