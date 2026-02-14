import { IsString, MinLength, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServerDto {
  @ApiProperty({ 
    description: 'Server name',
    example: 'My Gaming Server' 
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ 
    description: 'Server description',
    example: 'A place for gamers to chat and hang out',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ 
    description: 'Server icon URL',
    required: false 
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ 
    description: 'Whether the server is public or private',
    example: false,
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}