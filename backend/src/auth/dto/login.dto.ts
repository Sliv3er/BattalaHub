import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ 
    description: 'Username or email address',
    example: 'john_doe or john@example.com' 
  })
  @IsString()
  @MinLength(3)
  identifier: string;

  @ApiProperty({ 
    description: 'User password',
    example: 'MySecurePassword123!' 
  })
  @IsString()
  @MinLength(1)
  password: string;
}