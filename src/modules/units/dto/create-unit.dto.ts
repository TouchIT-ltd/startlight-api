import { IsString, IsNumber, IsIn, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({
    description: 'ID of the property this unit belongs to',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  propertyId!: string;

  @ApiProperty({
    description: 'Unit number within the property',
    example: 'A101',
  })
  @IsString()
  unitNumber!: string;

  @ApiProperty({
    description: 'Property specification (e.g., bedrooms, bathrooms, features)',
    example: '2 bedroom, 1 bathroom, kitchen, living room',
  })
  @IsString()
  propertySpecification!: string;

  @ApiProperty({
    description: 'Description of the unit',
    example: 'Spacious 2-bedroom apartment with balcony',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'Monthly rent price',
    example: 1200,
  })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({
    description: 'Lease duration in months',
    example: 12,
  })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(1)
  duration!: number;

  @ApiProperty({
    description: 'Number of bedrooms',
    example: 2,
  })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(0)
  bedrooms!: number;

  @ApiProperty({
    description: 'Number of bathrooms',
    example: 1,
  })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(0)
  bathrooms!: number;

  @ApiProperty({
    description: 'Current status of the unit',
    example: 'vacant',
    enum: ['vacant', 'occupied', 'maintenance'],
  })
  @IsString()
  @IsIn(['vacant', 'occupied', 'maintenance'])
  status!: 'vacant' | 'occupied' | 'maintenance';

  @ApiPropertyOptional({
    description: 'ID of the tenant currently occupying this unit',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;
  @ApiPropertyOptional({
    description: 'Unit image URL',
    type: String,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    description: 'Amenities available in this unit (comma-separated)',
    example: 'Air Conditioning, Parking, Wi-Fi',
    type: String,
  })
  @IsOptional()
  @IsString()
  amenities?: string;
}