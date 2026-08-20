import { Module } from '@nestjs/common';
import { AccessTestController } from './access-test.controller';

@Module({ controllers: [AccessTestController] })
export class AccessTestModule {}
