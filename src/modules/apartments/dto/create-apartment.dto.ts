import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApartmentDto {
  @ApiProperty({ example: 'Cozy 2BR near park' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'A lovely apartment with natural light' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1200 })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({
    example: 'mo',
    description: 'Price unit',
    enum: ['mo', 'year'],
  })
  @IsString()
  @IsIn(['mo', 'year'])
  priceUnit!: 'mo' | 'year';

  @ApiProperty({ example: 'Ikeja' })
  @IsString()
  location!: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 2 })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(0)
  bedrooms!: number;

  @ApiProperty({ example: 1 })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(0)
  bathrooms!: number;

  @ApiProperty({ example: 1200 })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(0)
  squareFeet!: number;

  @ApiProperty({ example: 6, description: 'Minimum lease term' })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(1)
  minTerm!: number;

  @ApiProperty({
    example: 'month',
    description: 'Minimum term unit',
    enum: ['month', 'year'],
  })
  @IsString()
  @IsIn(['month', 'year'])
  minTermUnit!: 'month' | 'year';

  @ApiPropertyOptional({ example: ['WiFi', 'Parking', 'Pool'] })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({
    example: [],
    description: 'Array of image URLs (max 5)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5, { message: 'Maximum 5 images allowed' })
  images?: string[];
}
