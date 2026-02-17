import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { EmailService } from './shared/email/email.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  async getHello(): Promise<any> {
    // const res = await this.emailService.sendEmail(
    //   'devlord1250@gmail.com',
    //   'Report Request',
    //   '<h1>Helle</h1>',
    // );

    return {
      status: 200,
      message: '🚀 Server up and running',
    };
  }
}
