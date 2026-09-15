import { ApiProperty } from '@nestjs/swagger';

export class LeaseCountdownResponseDto {
  @ApiProperty({ example: 'mongo_1616161616_abcd1234', description: 'Lease ID' })
  leaseId!: string;

  @ApiProperty({ example: 'mongo_1616161616_abcd1230', description: 'Tenant / User ID' })
  userId!: string;

  @ApiProperty({ example: 'A101', description: 'Unit number' })
  unitNumber!: string;

  @ApiProperty({ example: 'mongo_1616161616_abcd1235', description: 'Property ID' })
  propertyId!: string;

  @ApiProperty({ example: 1200, description: 'Rent amount' })
  rentAmount!: number;

  @ApiProperty({ example: '2026-03-01', description: 'Next payment due date (YYYY-MM-DD)' })
  dueDate!: string;

  @ApiProperty({ example: 5, description: 'Days remaining until payment is due' })
  daysRemaining!: number;

  @ApiProperty({ example: 120, description: 'Hours remaining until payment is due' })
  hoursRemaining!: number;

  @ApiProperty({ example: false, description: 'Whether the payment is overdue' })
  isOverdue!: boolean;

  @ApiProperty({ example: '5 day(s) remaining', description: 'Human readable formatted countdown string' })
  formattedCountdown!: string;

  @ApiProperty({ example: 'active', description: 'Current status of the lease' })
  leaseStatus!: string;
}
