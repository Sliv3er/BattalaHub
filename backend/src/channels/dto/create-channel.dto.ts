import { IsString, MinLength, MaxLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChannelType } from '@prisma/client';

export class CreateChannelDto {
  @ApiProperty({ 
    description: 'Channel name',
    example: 'general' 
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ 
    description: 'Channel description',
    example: 'General discussion channel',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ 
    description: 'Channel type',
    enum: ChannelType,
    example: ChannelType.TEXT 
  })
  @IsEnum(ChannelType)
  type: ChannelType;

  @ApiProperty({ 
    description: 'Whether the channel is private',
    example: false,
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}