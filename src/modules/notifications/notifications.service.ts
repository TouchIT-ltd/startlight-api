import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

@Injectable()
export class NotificationsService {
  private readonly collection = 'notifications';

  constructor(private readonly mongoDb: MongoDatabaseService) {}

  async findAll(userId?: string, page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const filter = userId ? { userId } : {};

    const [items, total] = await Promise.all([
      this.mongoDb.findAll(
        this.collection,
        filter,
        { skip, limit, sort: { createdAt: -1 } },
      ),
      this.mongoDb.count(this.collection, filter),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    const item = await this.mongoDb.findOne(this.collection, id);
    if (!item) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return item;
  }

  async markAsRead(id: string): Promise<any> {
    // Check if notification exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    const updated = await this.mongoDb.update(this.collection, id, { isRead: true });

    if (!updated) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return updated;
  }

  async markAllAsRead(userId: string): Promise<{ message: string; modifiedCount: number }> {
    // Find all unread notifications for the user
    const unreadNotifications = await this.mongoDb.findAll(
      this.collection,
      { userId, isRead: false }
    );

    let modifiedCount = 0;

    // Update each notification individually
    for (const notification of unreadNotifications) {
      await this.mongoDb.update(this.collection, notification.id, { isRead: true });
      modifiedCount++;
    }

    return {
      message: 'All notifications marked as read',
      modifiedCount,
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if notification exists
    const existing = await this.mongoDb.findOne(this.collection, id);
    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    const deleted = await this.mongoDb.delete(this.collection, id);
    if (!deleted) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return { message: 'Notification deleted successfully' };
  }
}