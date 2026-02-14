import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ 
    description: 'Username (3-32 characters, alphanumeric and underscores only)',
    example: 'john_doe' 
  })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username: string;

  @ApiProperty({ 
    description: 'Email address',
    example: 'john@example.com' 
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: 'Password (minimum 8 characters)',
    example: 'MySecurePassword123!' 
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ 
    description: 'Display name (optional)',
    example: 'John Doe',
    required: false 
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  displayName?: string;
}