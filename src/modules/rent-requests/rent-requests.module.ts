import { Module } from '@nestjs/common';
import { RentRequestsController } from './rent-requests.controller';
import { RentRequestsService } from './rent-requests.service';

@Module({
  controllers: [RentRequestsController],
  providers: [RentRequestsService],
})
export class RentRequestsModule {}