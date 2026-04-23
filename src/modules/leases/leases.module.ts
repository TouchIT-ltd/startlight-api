import { Module } from '@nestjs/common';
import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';
import { LeaseSchedulerService } from './lease-scheduler.service';
import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [SharedModule, AuditLogsModule, NotificationsModule],
  controllers: [LeasesController],
  providers: [LeasesService, LeaseSchedulerService],
  exports: [LeasesService],
})
export class LeasesModule { }
