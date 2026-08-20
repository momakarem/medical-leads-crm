import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { MinimumRole } from '../../auth/presentation/decorators/minimum-role.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import { SaveTiktokConnectionDto } from '../application/dto/save-tiktok-connection.dto';
import { TiktokConnectionService } from '../application/services/tiktok-connection.service';

@Controller('tiktok')
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
@MinimumRole(UserRole.Admin)
export class TiktokConnectionsController {
  constructor(private readonly connections: TiktokConnectionService) {}
  @Get('connect') connect(): { auth_url: string } { return this.connections.getLoginUrl(); }
  @Get('callback') callback(@Query('code') code: string) { return this.connections.handleCallback(code); }
  @Get('sessions/:sessionId/forms') listForms(@Param('sessionId') sessionId: string, @Query('advertiser_id') advertiserId: string) { return this.connections.listForms(sessionId, advertiserId); }
  @Post('connections') save(@Body() dto: SaveTiktokConnectionDto, @CurrentUser() user: AuthenticatedUser) { return this.connections.saveConnection(dto, user); }
  @Get('connections/current') current() { return this.connections.getCurrentConnection(); }
}
