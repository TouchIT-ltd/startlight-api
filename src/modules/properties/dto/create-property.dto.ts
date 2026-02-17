import { IsString, IsNumber, IsOptional, Min, IsArray } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty({
    description: 'Name of the property',
    example: 'Sunset Apartments',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Full address of the property',
    example: '123 Main Street, Downtown, City, State 12345',
  })
  @IsString()
  address!: string;

  @ApiProperty({
    description: 'Description of the property',
    example: 'Modern apartment complex with excellent amenities',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'Total number of units in the property',
    example: 50,
  })

  @IsNumber()
  @Min(1)
  totalUnits!: number;

  @ApiProperty({
    description: 'ID of the owner who owns this property',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  ownerId!: string;

  @ApiPropertyOptional({
    description: 'ID of the manager assigned to this property',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional({
    description: 'Array of image URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}