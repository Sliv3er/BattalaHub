import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  async findAll(take = 50, skip = 0) {
    return this.prisma.user.findMany({
      take,
      skip,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmailOrUsername(email?: string, username?: string) {
    if (!email && !username) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          username ? { username } : {},
        ].filter(Boolean),
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async updateOnlineStatus(id: string, isOnline: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: {
        isOnline,
        lastSeen: new Date(),
      },
    });
  }

  async searchUsers(query: string, take = 20) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            displayName: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      take,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        isOnline: true,
      },
    });
  }

  async remove(id: string) {
    const user = await this.findById(id);

    return this.prisma.user.delete({
      where: { id },
    });
  }
}