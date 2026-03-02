import { IsString, IsNumber, IsOptional, Min, IsArray } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

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
    description: 'Email of the owner who owns this property',
    example: 'owner@example.com',
  })
  @IsString()
  ownerEmail!: string;

  @ApiPropertyOptional({
    description: 'Email of the manager assigned to this property',
    example: 'manager@example.com',
  })
  @IsOptional()
  @IsString()
  managerEmail?: string;

  // backwards-compatibility fields (IDs can still be provided if needed)
  @ApiPropertyOptional({
    description: 'ID of the owner (deprecated, prefer ownerEmail)',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({
    description: 'ID of the manager (deprecated, prefer managerEmail)',
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
export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}
