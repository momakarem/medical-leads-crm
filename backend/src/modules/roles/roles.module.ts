import { Module } from '@nestjs/common';
import { CustomRolesService } from './application/services/custom-roles.service';
import { RolesController } from './presentation/roles.controller';

@Module({
  controllers: [RolesController],
  providers: [CustomRolesService],
})
export class RolesModule {}