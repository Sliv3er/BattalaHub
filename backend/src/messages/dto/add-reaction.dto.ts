import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddReactionDto {
  @ApiProperty({ 
    description: 'Emoji for reaction (can be unicode emoji or custom emoji name)',
    example: '👍' 
  })
  @IsString()
  @Length(1, 50)
  emoji: string;
}