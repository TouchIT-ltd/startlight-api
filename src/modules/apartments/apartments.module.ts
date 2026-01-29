import { Module } from '@nestjs/common';
import { ApartmentsController } from './apartments.controller';
import { ApartmentsService } from './apartments.service';
import { CloudinaryService } from '../../shared/services/cloudinary.service';

@Module({
  controllers: [ApartmentsController],
  providers: [ApartmentsService, CloudinaryService],
})
export class ApartmentsModule {}
