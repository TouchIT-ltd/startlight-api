import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RentRuleResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the rent rule',
    example: '507f1f77bcf86cd799439011',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the property this rule applies to',
    example: '507f1f77bcf86cd799439012',
  })
  propertyId!: string;

  @ApiProperty({
    description: 'Base rent amount',
    example: 1200.00,
  })
  baseRent!: number;

  @ApiPropertyOptional({
    description: 'Late fee amount',
    example: 50.00,
  })
  lateFee?: number;

  @ApiPropertyOptional({
    description: 'Grace period in days',
    example: 5,
  })
  gracePeriodDays?: number;

  @ApiPropertyOptional({
    description: 'Due day of the month',
    example: 1,
  })
  dueDayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'Additional rules or notes',
    example: 'No pets allowed, security deposit required',
  })
  additionalRules?: string;

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