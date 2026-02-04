import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RentRequestResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the rent request',
    example: '507f1f77bcf86cd799439011',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the tenant making the request',
    example: '507f1f77bcf86cd799439012',
  })
  tenantId!: string;

  @ApiProperty({
    description: 'ID of the lease this request relates to',
    example: '507f1f77bcf86cd799439013',
  })
  leaseId!: string;

  @ApiProperty({
    description: 'Type of rent request',
    example: 'partial_payment',
    enum: ['partial_payment', 'payment_plan', 'extension', 'reduction', 'other'],
  })
  requestType!: string;

  @ApiProperty({
    description: 'Amount requested',
    example: 600.00,
  })
  requestedAmount!: number;

  @ApiProperty({
    description: 'Reason for the request',
    example: 'Financial difficulties due to medical expenses',
  })
  reason!: string;

  @ApiPropertyOptional({
    description: 'Additional notes or details',
    example: 'Can pay remaining $600 by end of next month',
  })
  notes?: string;

  @ApiProperty({
    description: 'Status of the request',
    example: 'pending',
    enum: ['pending', 'approved', 'rejected'],
  })
  status!: 'pending' | 'approved' | 'rejected';

  @ApiPropertyOptional({
    description: 'Manager notes on approval/rejection',
    example: 'Approved with condition to pay remaining by March 15th',
  })
  managerNotes?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt!: Date;
}