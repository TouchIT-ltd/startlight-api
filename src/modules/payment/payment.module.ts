import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeasesModule } from '../leases/leases.module';
import { UnitsModule } from '../units/units.module';

@Module({
    imports: [SharedModule, AuditLogsModule, NotificationsModule, LeasesModule, UnitsModule],
    controllers: [PaymentController],
    providers: [PaymentService],
    exports: [PaymentService],
})
export class PaymentModule { }
