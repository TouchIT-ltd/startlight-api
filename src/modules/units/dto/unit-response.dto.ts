import { ApiProperty } from '@nestjs/swagger';

export class UnitResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the unit',
    example: '507f1f77bcf86cd799439011',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the property this unit belongs to',
    example: '507f1f77bcf86cd799439012',
  })
  propertyId!: string;

  @ApiProperty({
    description: 'Unit number within the property',
    example: 'A101',
  })
  unitNumber!: string;

  @ApiProperty({
    description: 'Description of the unit',
    example: 'Spacious 2-bedroom apartment with balcony',
  })
  description!: string;

  @ApiProperty({
    description: 'Monthly rent price',
    example: 1200,
  })
  price!: number;

  @ApiProperty({
    description: 'Lease duration in months',
    example: 12,
  })
  duration!: number;

  @ApiProperty({
    description: 'Number of bedrooms',
    example: 2,
  })
  bedrooms!: number;

  @ApiProperty({
    description: 'Number of bathrooms',
    example: 1,
  })
  bathrooms!: number;

  @ApiProperty({
    description: 'Current status of the unit',
    example: 'vacant',
    enum: ['vacant', 'occupied', 'maintenance'],
  })
  status!: 'vacant' | 'occupied' | 'maintenance';

  @ApiProperty({
    description: 'ID of the tenant currently occupying this unit',
    example: '507f1f77bcf86cd799439013',
    required: false,
  })
  tenantId?: string;

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