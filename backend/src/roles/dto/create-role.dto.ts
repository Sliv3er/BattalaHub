import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string = '#ffffff';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[] = [];
}
