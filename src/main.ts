import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';

const server = express();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server), // 👈 pass the express instance
  );

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.json({ limit: '50mb' }));

  // CORS
  app.enableCors({
    origin: configService.get('config.app.frontendUrl'),
    credentials: true,
  });

  // Serve static files — NOTE: won't work on Vercel (read-only filesystem)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  // Global prefix
  app.setGlobalPrefix(configService.get('config.app.apiPrefix') as string);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
      forbidNonWhitelisted: false,
      exceptionFactory: (errors) => {
        console.error('Validation Errors:', JSON.stringify(errors, null, 2));
        return new BadRequestException(errors);
      },
    }),
  );

  // Setup Swagger
  setupSwagger(app);

  await app.init(); // 👈 use init() instead of listen()
}

bootstrap();

export default server; // 👈 Vercel needs this
