import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../../shared/email/email.service';

@Injectable()
export class LeaseSchedulerService {
  private readonly logger = new Logger(LeaseSchedulerService.name);
  private readonly collection = 'leases';

  constructor(
    private readonly mongoDb: MongoDatabaseService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Runs on the 1st of every month at midnight (00:00) to expire active leases whose end date has passed.
   * Uses compound index on (status, endDate) for optimal performance.
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT) // At 00:00 on day 1 of every month ('0 0 1 * *')
  async expireLeases() {
    try {
      this.logger.log('Starting lease expiration check...');

      const now = new Date();
      const currentDateStr = now.toISOString().split('T')[0];

      // Query for active leases that have reached or passed their end date
      // Uses compound index: { status: 1, endDate: 1 }
      const expiredLeases = await this.mongoDb.findAll(this.collection, {
        status: 'active',
        $or: [
          { endDate: { $lte: currentDateStr } },
          { endDate: { $lte: now.toISOString() } },
        ],
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

  /**
   * Runs daily at midnight to check for active leases due within 7 days
   * and sends automated email reminders and in-app notifications.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async send7DayPaymentReminders() {
    try {
      this.logger.log('Starting 7-day lease payment reminder check...');

      const activeLeases = await this.mongoDb.findAll(this.collection, {
        status: 'active',
      });

      if (!activeLeases || activeLeases.length === 0) {
        this.logger.log('No active leases found for payment reminders');
        return { processed: 0, sent: 0 };
      }

      const now = new Date();
      const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStr = todayZero.toISOString().split('T')[0];

      let sentCount = 0;
      let errorCount = 0;

      for (const lease of activeLeases) {
        try {
          const dueDateStr = lease.nextPaymentDueDate || lease.endDate;
          if (!dueDateStr) continue;

          const dueDate = new Date(dueDateStr);
          const dueDateZero = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
          const diffTime = dueDateZero.getTime() - todayZero.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Target reminders when days remaining is between 0 and 7 days
          if (daysRemaining >= 0 && daysRemaining <= 7) {
            // Check if reminder was already sent today for this lease
            if (lease.lastReminderSentDate === todayStr) {
              this.logger.debug(`Reminder already sent today for lease ${lease.id}`);
              continue;
            }

            const tenantId = lease.userId || lease.tenantId;
            if (!tenantId) continue;

            const tenant = await this.mongoDb.findOne('users', tenantId).catch(() => null);
            if (!tenant || !tenant.email) continue;

            const fullname = tenant.fullname || tenant.fullName || 'Valued Tenant';
            const unitNumber = lease.unitNumber || 'assigned unit';
            const amount = lease.rentAmount || 0;

            // 1. Send Email Reminder
            await this.emailService.sendPaymentReminderEmail(
              tenant.email,
              fullname,
              unitNumber,
              dueDateStr.split('T')[0],
              daysRemaining,
              amount,
            );

            // 2. Send In-App Notification
            const countdownMsg = daysRemaining === 0
              ? 'Your rent payment is due today!'
              : `Your rent payment is due in ${daysRemaining} day(s).`;

            await this.notificationsService.create({
              userId: tenantId,
              title: `Payment Reminder: ${unitNumber}`,
              message: countdownMsg,
              type: 'RENT_REMINDER',
              entityId: lease.id,
            });

            // 3. Mark lease as reminded today
            await this.mongoDb.update(this.collection, lease.id, {
              lastReminderSentDate: todayStr,
              updatedAt: new Date(),
            });

            // Audit log
            await this.auditLogsService.create({
              userId: 'system',
              action: 'PAYMENT_REMINDER_SENT',
              entityType: 'lease',
              entityId: lease.id,
              details: {
                tenantEmail: tenant.email,
                unitNumber,
                daysRemaining,
                dueDate: dueDateStr,
              },
              createdAt: new Date(),
            });

            sentCount++;
            this.logger.log(`Sent 7-day payment reminder to ${tenant.email} for unit ${unitNumber} (${daysRemaining} days left)`);
          }
        } catch (err: any) {
          errorCount++;
          this.logger.error(`Error processing reminder for lease ${lease.id}: ${err.message}`);
        }
      }

      this.logger.log(`Completed 7-day payment reminders: ${sentCount} sent, ${errorCount} errors`);
      return { processed: activeLeases.length, sent: sentCount, errors: errorCount };
    } catch (error: any) {
      this.logger.error(`Error in send7DayPaymentReminders cron: ${error.message}`);
      return { processed: 0, sent: 0, errors: 1 };
    }
  }

  /**
   * Manual trigger for testing 7-day payment reminders via API
   */
  async triggerPaymentRemindersManually() {
    this.logger.log('Manual 7-day payment reminder check triggered');
    return this.send7DayPaymentReminders();
  }
}