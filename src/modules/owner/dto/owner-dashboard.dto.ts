import { ApiProperty } from '@nestjs/swagger';

export class OwnerDashboardDto {
  @ApiProperty({
    description: 'Total number of properties owned',
    example: 8,
  })
  totalProperties!: number;

  @ApiProperty({
    description: 'Total number of units across all properties',
    example: 240,
  })
  totalUnits!: number;

  @ApiProperty({
    description: 'Number of occupied units',
    example: 200,
  })
  occupiedUnits!: number;

  @ApiProperty({
    description: 'Number of vacant units',
    example: 40,
  })
  vacantUnits!: number;

  @ApiProperty({
    description: 'Overall occupancy rate as percentage',
    example: 83.3,
  })
  occupancyRate!: number;

  @ApiProperty({
    description: 'Total monthly revenue from all properties',
    example: 72000.00,
  })
  totalRevenue!: number;

  @ApiProperty({
    description: 'Total outstanding rent arrears',
    example: 8500.00,
  })
  totalArrears!: number;

  @ApiProperty({
    description: 'Revenue trend data for the last 12 months',
    example: {
      '2024-01': 65000,
      '2024-02': 68000,
      '2024-03': 72000,
    },
  })
  revenueTrend!: Record<string, number>;

  @ApiProperty({
    description: 'Occupancy distribution by property',
    example: [
      { propertyName: 'Sunset Apartments', occupancyRate: 95.0 },
      { propertyName: 'Downtown Heights', occupancyRate: 78.5 },
    ],
  })
  occupancyDistribution!: Array<{
    propertyName: string;
    occupancyRate: number;
  }>;

  @ApiProperty({
    description: 'Top performing properties by revenue',
    example: [
      { propertyName: 'Sunset Apartments', revenue: 25000 },
      { propertyName: 'Downtown Heights', revenue: 22000 },
    ],
  })
  topProperties!: Array<{
    propertyName: string;
    revenue: number;
  }>;
}