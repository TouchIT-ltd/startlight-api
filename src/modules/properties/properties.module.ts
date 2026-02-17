import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { UsersModule } from '../users/users.module';

@Module({
  imports: [SharedModule, AuditLogsModule, UsersModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule { }