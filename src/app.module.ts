import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { SharedModule } from './shared/shared.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ApartmentsModule } from './modules/apartments/apartments.module';
import { LeasesModule } from './modules/leases/leases.module';
import { IssuesModule } from './modules/issues/issues.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { UserPreferencesModule } from './modules/user-preferences/user-preferences.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    SharedModule,
    UsersModule,
    AuthModule,
    ApartmentsModule,
    LeasesModule,
    IssuesModule,
    NotificationsModule,
    DocumentsModule,
    UserPreferencesModule,
  ],
})
export class AppModule {}
