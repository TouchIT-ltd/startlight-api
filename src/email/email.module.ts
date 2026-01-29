import { Module } from '@nestjs/common';
import { EmailService } from '../shared/email/email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
