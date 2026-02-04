import { Injectable } from '@nestjs/common';
import { MongoDatabaseService } from '../../shared/database/mongo-database.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly mongoDb: MongoDatabaseService,
  ) {}

  async getDashboard(): Promise<any> {
    // Get all users and count by role
    const allUsers = await this.mongoDb.findAll('users', {});
    const userDistribution = {
      admin: allUsers.filter(u => u.role === 'admin').length,
      owner: allUsers.filter(u => u.role === 'owner').length,
      manager: allUsers.filter(u => u.role === 'manager').length,
      tenant: allUsers.filter(u => u.role === 'tenant').length,
    };

    // Get all properties
    const allProperties = await this.mongoDb.findAll('properties', {});
    const activeProperties = allProperties.length;

    // Get all units
    const allUnits = await this.mongoDb.findAll('units', {});
    const activeUnits = allUnits.length;

    // Get recent audit events (placeholder - would need audit logs)
    const recentAuditEvents = 0;

    // System health (placeholder)
    const systemHealth = 'healthy';

    // System metrics (placeholder)
    const systemMetrics = {
      totalRevenue: 0,
      occupancyRate: 0,
      pendingIssues: 0,
    };

    // Recent alerts (placeholder)
    const recentAlerts = [
      {
        id: 'alert_001',
        type: 'info' as const,
        message: 'System running normally',
        timestamp: new Date().toISOString(),
      },
    ];

    return {
      totalUsers: allUsers.length,
      activeProperties,
      activeUnits,
      systemHealth,
      recentAuditEvents,
      userDistribution,
      systemMetrics,
      recentAlerts,
    };
  }
}