import { ApiProperty } from '@nestjs/swagger';

export class ManagerDashboardDto {
  @ApiProperty({
    description: 'Total number of properties managed by this manager',
    example: 5,
  })
  totalProperties!: number;

  @ApiProperty({
    description: 'Total number of units across all properties',
    example: 150,
  })
  totalUnits!: number;

  @ApiProperty({
    description: 'Number of occupied units',
    example: 120,
  })
  occupiedUnits!: number;

  @ApiProperty({
    description: 'Number of vacant units',
    example: 30,
  })
  vacantUnits!: number;

  @ApiProperty({
    description: 'Occupancy rate as percentage',
    example: 80.0,
  })
  occupancyRate!: number;

  @ApiProperty({
    description: 'Number of pending rent requests',
    example: 8,
  })
  pendingRequests!: number;

  @ApiProperty({
    description: 'Total rent collected this month',
    example: 45000.00,
  })
  rentCollected!: number;

  @ApiProperty({
    description: 'Total rent arrears',
    example: 12500.00,
  })
  rentArrears!: number;

  @ApiProperty({
    description: 'Monthly revenue statistics',
    example: {
      january: 42000,
      february: 45000,
      march: 48000,
    },
  })
  monthlyStats!: Record<string, number>;
}