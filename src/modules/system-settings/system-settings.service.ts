import { Injectable } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

@Injectable()
export class SystemSettingsService {
  private readonly collection = 'system-settings';

  constructor(private readonly mongoDb: MongoDatabaseService) {}

  async getSettings(): Promise<any> {
    // Get the first (and only) system settings document
    const settings = await this.mongoDb.findOneBy(this.collection, {});

    if (!settings) {
      // Return default settings if none exist
      return {
        emailAlertsDefault: true,
        smsNotificationsDefault: false,
        pushNotificationsDefault: true,
        maxFileSizeMB: 10,
        maintenanceMode: false,
      };
    }

    return settings;
  }

  async updateSettings(settings: any): Promise<any> {
    // Get existing settings
    const existing = await this.mongoDb.findOneBy(this.collection, {});

    if (existing) {
      // Update existing settings
      return this.mongoDb.update(this.collection, existing.id, settings);
    } else {
      // Create new settings document
      return this.mongoDb.create(this.collection, settings);
    }
  }
}