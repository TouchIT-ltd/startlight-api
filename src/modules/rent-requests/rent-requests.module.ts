import { Module } from '@nestjs/common';
import { RentRequestsController } from './rent-requests.controller';
import { RentRequestsService } from './rent-requests.service';

import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SharedModule, AuditLogsModule, NotificationsModule],
  controllers: [RentRequestsController],
  providers: [RentRequestsService],
})
export class RentRequestsModule { }