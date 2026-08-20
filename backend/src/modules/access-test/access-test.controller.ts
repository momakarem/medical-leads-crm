import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '../users/domain/user-role.enum';
import { MinimumRole } from '../auth/presentation/decorators/minimum-role.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../auth/presentation/guards/minimum-role.guard';

@Controller()
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
export class AccessTestController {
  @Get('admin/test')
  @MinimumRole(UserRole.Admin)
  adminTest(): { message: string } {
    return { message: 'Admin access granted.' };
  }

  @Get('manager/test')
  @MinimumRole(UserRole.Manager)
  managerTest(): { message: string } {
    return { message: 'Manager access granted.' };
  }

  @Get('agent/test')
  @MinimumRole(UserRole.Agent)
  agentTest(): { message: string } {
    return { message: 'Agent access granted.' };
  }
}
