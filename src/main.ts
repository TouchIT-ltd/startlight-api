import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
const compression = require('compression');
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());
  
  // CORS
  app.enableCors({
    origin: configService.get('config.app.frontendUrl'),
    credentials: true,
  });
  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });
  // Global prefix
  app.setGlobalPrefix(configService.get('config.app.apiPrefix') as string);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Setup Swagger
  if (configService.get('config.app.nodeEnv') !== 'production') {
    setupSwagger(app);
  }

  const port = configService.get('config.app.port');
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}/${configService.get('config.app.apiPrefix')}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api-docs`);
}
bootstrap();