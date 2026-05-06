import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeaseSchedulerService {
  private readonly logger = new Logger(LeaseSchedulerService.name);
  private readonly collection = 'leases';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Runs every 2 minutes to expire leases that were created 2+ minutes ago (for testing renewal)
   * Uses compound index on (status, createdAt) for optimal performance
   */
  @Cron('*/2 * * * *') // Every 2 minutes
  async expireLeases() {
    try {
      this.logger.log('Starting lease expiration check...');

      // Calculate 2 minutes ago for testing
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      // Query for active leases that were created 2+ minutes ago
      // This query will use the compound index: { status: 1, createdAt: 1 }
      const expiredLeases = await this.mongoDb.findAll(this.collection, {
        status: 'active',
        createdAt: { $lt: twoMinutesAgo }
      });

      if (expiredLeases.length === 0) {
        this.logger.log('No expired leases found');
        return;
      }

      this.logger.log(`Found ${expiredLeases.length} expired leases to process`);

      // Process in batches of 100 to avoid memory issues with large datasets
      const batchSize = 100;
      let processedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < expiredLeases.length; i += batchSize) {
        const batch = expiredLeases.slice(i, i + batchSize);
        const batchResults = await this.processLeaseBatch(batch);

        processedCount += batchResults.successful;
        errorCount += batchResults.errors;
      }

      this.logger.log(`Lease expiration completed: ${processedCount} successful, ${errorCount} errors`);

      // Create system audit log for the batch operation
      await this.auditLogsService.create({
        userId: 'system',
        action: 'BATCH_LEASE_EXPIRATION',
        entityType: 'lease',
        entityId: 'batch',
        details: {
          totalFound: expiredLeases.length,
          processed: processedCount,
          errors: errorCount,
          timestamp: new Date()
        },
        createdAt: new Date(),
      });

    } catch (error: any) {
      this.logger.error('Error in lease expiration cron job:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      // Create error audit log
      await this.auditLogsService.create({
        userId: 'system',
        action: 'LEASE_EXPIRATION_ERROR',
        entityType: 'system',
        entityId: 'cron',
        details: {
          error: error.message,
          stack: error.stack
        },
        createdAt: new Date(),
      });
    }
  }

  /**
   * Process a batch of expired leases
   */
  private async processLeaseBatch(leases: any[]): Promise<{ successful: number; errors: number }> {
    let successful = 0;
    let errors = 0;

    const updatePromises = leases.map(async (lease) => {
      try {
        // Update lease status to expired
        await this.mongoDb.update(this.collection, lease.id, {
          status: 'expired',
          expiredAt: new Date(),
          updatedAt: new Date(),
        });

        // Create notification for the tenant
        await this.notificationsService.create({
          userId: lease.userId,
          title: 'Lease Expired',
          message: `Your lease for unit ${lease.unitNumber} has expired. You can renew it if needed.`,
          type: 'LEASE_EXPIRED',
          entityId: lease.id,
        });

        // Create audit log for individual lease
        await this.auditLogsService.create({
          userId: 'system',
          action: 'LEASE_AUTO_EXPIRED',
          entityType: 'lease',
          entityId: lease.id,
          details: {
            propertyId: lease.propertyId,
            unitNumber: lease.unitNumber,
            createdAt: lease.createdAt,
            expiredAt: new Date()
          },
          createdAt: new Date(),
        });

        successful++;
        this.logger.debug(`Expired lease ${lease.id} for unit ${lease.unitNumber}`);

      } catch (error: any) {
        errors++;
        this.logger.error(`Failed to expire lease ${lease.id}:`, {
          error: error.message,
          leaseId: lease.id,
          unitNumber: lease.unitNumber,
        });
      }
    });

    await Promise.allSettled(updatePromises);
    return { successful, errors };
  }

  /**
   * Manual trigger for testing or immediate execution
   * Can be called via API endpoint for testing purposes
   */
  async expireLeasesManually(): Promise<{ processed: number; errors: number }> {
    this.logger.log('Manual lease expiration triggered');
    await this.expireLeases();

    // Return summary (this is a simplified version - in production you'd track the actual counts)
    return { processed: 0, errors: 0 };
  }
}