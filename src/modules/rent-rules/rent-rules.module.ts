import { Module } from '@nestjs/common';
import { RentRulesController } from './rent-rules.controller';
import { RentRulesService } from './rent-rules.service';

@Module({
  controllers: [RentRulesController],
  providers: [RentRulesService],
})
export class RentRulesModule {}