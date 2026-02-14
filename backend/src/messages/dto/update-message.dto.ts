import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMessageDto {
  @ApiProperty({ 
    description: 'Updated message content',
    example: 'Hello everyone! 👋 (edited)' 
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}