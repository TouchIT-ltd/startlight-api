import { Module } from '@nestjs/common';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [SharedModule, AuditLogsModule],
  controllers: [UnitsController],
  providers: [UnitsService],
})
export class UnitsModule { }