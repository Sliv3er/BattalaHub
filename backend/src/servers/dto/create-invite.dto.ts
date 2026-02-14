import { IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateInviteDto {
  @ApiProperty({ 
    description: 'Maximum number of uses (null for unlimited)',
    example: 10,
    required: false 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxUses?: number;

  @ApiProperty({ 
    description: 'Expiration date (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}