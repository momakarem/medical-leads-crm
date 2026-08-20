import { IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../../users/domain/user-role.enum';

export class SaveCustomRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(UserRole)
  baseRole!: UserRole;

  @IsObject()
  permissions!: Record<string, string[]>;
}