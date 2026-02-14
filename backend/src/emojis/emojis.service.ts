import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class EmojisService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async create(serverId: string, name: string, file: Express.Multer.File, userId: string) {
    const url = await this.storageService.uploadFile(file, userId);
    // Strip colons if user includes them (e.g. ":name:" -> "name")
    const cleanName = name.replace(/:/g, '').trim();
    return this.prisma.emoji.create({
      data: { name: cleanName, url, serverId, creatorId: userId },
    });
  }

  async findAll(serverId: string) {
    return this.prisma.emoji.findMany({
      where: { serverId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(id: string, userId: string) {
    const emoji = await this.prisma.emoji.findUnique({ where: { id } });
    if (!emoji) throw new NotFoundException('Emoji not found');
    return this.prisma.emoji.delete({ where: { id } });
  }
}
