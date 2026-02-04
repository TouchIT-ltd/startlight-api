import { ApiProperty } from '@nestjs/swagger';

export class PropertyResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the property',
    example: '507f1f77bcf86cd799439011',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the property',
    example: 'Sunset Apartments',
  })
  name!: string;

  @ApiProperty({
    description: 'Full address of the property',
    example: '123 Main Street, Downtown, City, State 12345',
  })
  address!: string;

  @ApiProperty({
    description: 'Description of the property',
    example: 'Modern apartment complex with excellent amenities',
  })
  description!: string;

  @ApiProperty({
    description: 'Total number of units in the property',
    example: 50,
  })
  totalUnits!: number;

  @ApiProperty({
    description: 'ID of the owner who owns this property',
    example: '507f1f77bcf86cd799439012',
  })
  ownerId!: string;

  @ApiProperty({
    description: 'ID of the manager assigned to this property',
    example: '507f1f77bcf86cd799439013',
    required: false,
  })
  managerId?: string;

  @ApiProperty({
    description: 'Array of image URLs for the property',
    example: ['https://res.cloudinary.com/demo/image/upload/v1234567890/properties/property1.jpg'],
    type: [String],
  })
  images!: string[];

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