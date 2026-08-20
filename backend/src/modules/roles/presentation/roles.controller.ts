import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MinimumRole } from '../../auth/presentation/decorators/minimum-role.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import { SaveCustomRoleDto } from '../application/dto/save-custom-role.dto';
import { CustomRolesService, type CustomRoleResponse } from '../application/services/custom-roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
export class RolesController {
  constructor(private readonly roles: CustomRolesService) {}

  @Get()
  @MinimumRole(UserRole.Manager)
  list(): Promise<CustomRoleResponse[]> {
    return this.roles.list();
  }

  @Post()
  @MinimumRole(UserRole.Admin)
  create(@Body() dto: SaveCustomRoleDto): Promise<CustomRoleResponse> {
    return this.roles.create(dto);
  }

  @Patch(':id')
  @MinimumRole(UserRole.Admin)
  update(@Param('id') id: string, @Body() dto: SaveCustomRoleDto): Promise<CustomRoleResponse> {
    return this.roles.update(id, dto);
  }

  @Delete(':id')
  @MinimumRole(UserRole.Admin)
  delete(@Param('id') id: string): Promise<{ success: true }> {
    return this.roles.delete(id);
  }
}