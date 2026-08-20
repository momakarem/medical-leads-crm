import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { MinimumRole } from '../../auth/presentation/decorators/minimum-role.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import { SaveSnapchatConnectionDto } from '../application/dto/save-snapchat-connection.dto';
import { SnapchatConnectionService } from '../application/services/snapchat-connection.service';

@Controller('snapchat')
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
@MinimumRole(UserRole.Admin)
export class SnapchatConnectionsController {
  constructor(private readonly connections: SnapchatConnectionService) {}
  @Get('connect') connect(): { auth_url: string } { return this.connections.getLoginUrl(); }
  @Get('callback') callback(@Query('code') code: string) { return this.connections.handleCallback(code); }
  @Get('sessions/:sessionId/forms') listForms(@Param('sessionId') sessionId: string, @Query('ad_account_id') adAccountId: string) { return this.connections.listForms(sessionId, adAccountId); }
  @Post('connections') save(@Body() dto: SaveSnapchatConnectionDto, @CurrentUser() user: AuthenticatedUser) { return this.connections.saveConnection(dto, user); }
  @Get('connections/current') current() { return this.connections.getCurrentConnection(); }
}
