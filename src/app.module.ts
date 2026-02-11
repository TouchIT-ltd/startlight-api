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
import { PropertiesModule } from './modules/properties/properties.module';
import { UnitsModule } from './modules/units/units.module';
import { ManagerModule } from './modules/manager/manager.module';
import { RentRulesModule } from './modules/rent-rules/rent-rules.module';
import { RentRequestsModule } from './modules/rent-requests/rent-requests.module';
import { OwnerModule } from './modules/owner/owner.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';
import { PaymentModule } from './modules/payment/payment.module';

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
    PropertiesModule,
    UnitsModule,
    ManagerModule,
    RentRulesModule,
    RentRequestsModule,
    OwnerModule,
    ReportsModule,
    AdminModule,
    PaymentModule,
  ],
})
export class AppModule { }
