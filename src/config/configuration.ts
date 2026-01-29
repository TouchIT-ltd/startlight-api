import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME || 'NestJS App',
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    apiPrefix: process.env.API_PREFIX || 'api',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/test',
    testUri: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/test',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
    expiration: process.env.JWT_EXPIRATION || '7d',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'default-refresh-secret',
    refreshExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '30d',
  },
  throttler: {
    ttl: process.env.THROTTLE_TTL ? parseInt(process.env.THROTTLE_TTL, 10) : 60,
    limit: process.env.THROTTLE_LIMIT ? parseInt(process.env.THROTTLE_LIMIT, 10) : 100,
  },
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE, 10) : 5242880,
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || 'mailjet',
    mailjet: {
      apiKey: process.env.MAILJET_API_KEY,
      secretKey: process.env.MAILJET_SECRET_KEY,
      fromEmail: process.env.EMAIL_FROM || 'noreply@starlightapp.com',
      fromName: process.env.EMAIL_FROM_NAME || 'Starlight App',
    },
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dmtzusaxg',
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'starlight_upload',
  },
}));