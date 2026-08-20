import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { MinimumRole } from '../../auth/presentation/decorators/minimum-role.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { SaveFacebookConnectionDto } from '../application/dto/save-facebook-connection.dto';
import { FacebookConnectionService } from '../application/services/facebook-connection.service';

@Controller('facebook')
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
@MinimumRole(UserRole.Admin)
export class FacebookConnectionsController {
  constructor(private readonly connections: FacebookConnectionService) {}

  @Get('connect')
  connect(): { auth_url: string } {
    return this.connections.getLoginUrl();
  }

  @Get('callback')
  callback(@Query('code') code: string): Promise<{ session_id: string; pages: Array<{ id: string; name: string }> }> {
    return this.connections.handleCallback(code);
  }

  @Get('sessions/:sessionId/forms')
  listForms(@Param('sessionId') sessionId: string, @Query('page_id') pageId: string): Promise<{ forms: Array<{ id: string; name: string }> }> {
    return this.connections.listForms(sessionId, pageId);
  }

  @Post('connections')
  save(@Body() dto: SaveFacebookConnectionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.connections.saveConnection(dto, user);
  }

  @Get('connections/current')
  current() {
    return this.connections.getCurrentConnection();
  }
}
