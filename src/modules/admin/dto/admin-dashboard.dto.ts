import { ApiProperty } from '@nestjs/swagger';

export class AdminDashboardDto {
  @ApiProperty({
    description: 'Total number of users in the system',
    example: 156,
  })
  totalUsers!: number;

  @ApiProperty({
    description: 'Number of active properties',
    example: 42,
  })
  activeProperties!: number;

  @ApiProperty({
    description: 'Number of active units across all properties',
    example: 1250,
  })
  activeUnits!: number;

  @ApiProperty({
    description: 'System health status',
    example: 'healthy',
    enum: ['healthy', 'warning', 'critical'],
  })
  systemHealth!: 'healthy' | 'warning' | 'critical';

  @ApiProperty({
    description: 'Number of recent audit events',
    example: 23,
  })
  recentAuditEvents!: number;

  @ApiProperty({
    description: 'User distribution by role',
    example: {
      admin: 3,
      owner: 12,
      manager: 25,
      tenant: 116,
    },
  })
  userDistribution!: Record<string, number>;

  @ApiProperty({
    description: 'System metrics',
    example: {
      totalRevenue: 125000.00,
      occupancyRate: 87.5,
      pendingIssues: 15,
    },
  })
  systemMetrics!: {
    totalRevenue: number;
    occupancyRate: number;
    pendingIssues: number;
  };

  @ApiProperty({
    description: 'Recent system alerts',
    example: [
      {
        id: 'alert_001',
        type: 'warning',
        message: 'High memory usage detected',
        timestamp: '2024-01-15T10:30:00.000Z',
      },
    ],
  })
  recentAlerts!: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }>;
}