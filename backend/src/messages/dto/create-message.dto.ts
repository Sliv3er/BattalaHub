import { IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
  @ApiProperty({ 
    description: 'Message content',
    example: 'Hello everyone! 👋' 
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @ApiProperty({ 
    description: 'Message type',
    enum: MessageType,
    example: MessageType.USER,
    required: false 
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}