import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

@Injectable()
export class UserPreferencesService {
  private readonly collection = 'user_preferences';

  constructor(private readonly mongoDb: MongoDatabaseService) {}

  async findByUserId(userId: string): Promise<any> {
    let preferences = await this.mongoDb.findOneBy(this.collection, { userId });

    // If no preferences exist, create default ones
    if (!preferences) {
      const defaultPreferences = {
        userId,
        language: 'en',
        darkMode: false,
        emailNotifications: true,
        smsNotifications: false,
        rentReminders: true,
        maintenanceUpdates: true,
      };

      preferences = await this.mongoDb.create(this.collection, defaultPreferences);
    }

    return preferences;
  }

  async update(userId: string, data: any): Promise<any> {
    // Check if preferences exist
    let existing = await this.mongoDb.findOneBy(this.collection, { userId });

    if (!existing) {
      // Create with defaults and merge updates
      const defaultPreferences = {
        userId,
        language: 'en',
        darkMode: false,
        emailNotifications: true,
        smsNotifications: false,
        rentReminders: true,
        maintenanceUpdates: true,
        ...data,
      };

      return await this.mongoDb.create(this.collection, defaultPreferences);
    }

    // Update existing preferences
    const updated = await this.mongoDb.update(this.collection, existing.id, data);

    if (!updated) {
      throw new NotFoundException(`User preferences for user ${userId} not found`);
    }

    return updated;
  }
}