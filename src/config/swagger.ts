import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle(configService.get('config.app.name') as string)
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('Manager Portal', 'Manager Portal endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // Ensure 'Manager Portal' tag does not appear first in Swagger UI.
  // Some Swagger UIs display tags in the order found in `document.tags`.
  // If 'Manager Portal' exists, move it to the end of the tags array so
  // it won't be shown as the first section.
  if (document.tags && Array.isArray(document.tags)) {
    const idx = document.tags.findIndex((t: any) => t.name === 'Manager Portal');
    if (idx > -1) {
      const [mgr] = document.tags.splice(idx, 1);
      document.tags.push(mgr);
    }
  }
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
