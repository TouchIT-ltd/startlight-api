import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApartmentResponseDto {
  @ApiProperty({ example: 'mongo_1616161616_abcd1234' })
  id!: string;

  @ApiProperty({ example: 'Cozy 2BR near park' })
  title!: string;

  @ApiPropertyOptional({ example: 'A lovely apartment with natural light' })
  description?: string;

  @ApiProperty({ example: 1200 })
  price!: number;

  @ApiProperty({ example: 'mo', enum: ['mo', 'year'] })
  priceUnit!: 'mo' | 'year';

  @ApiProperty({ example: 'Ikeja' })
  location!: string;

  @ApiProperty({ example: 'Lagos' })
  city!: string;

  @ApiProperty({ example: 2 })
  bedrooms!: number;

  @ApiProperty({ example: 1 })
  bathrooms!: number;

  @ApiProperty({ example: 1200 })
  squareFeet!: number;

  @ApiProperty({ example: 6 })
  minTerm!: number;

  @ApiProperty({ example: 'month', enum: ['month', 'year'] })
  minTermUnit!: 'month' | 'year';

  @ApiPropertyOptional({ example: ['WiFi', 'Parking', 'Pool'] })
  amenities?: string[];

  @ApiPropertyOptional({
    example: [
      'https://res.cloudinary.com/.../image1.jpg',
      'https://res.cloudinary.com/.../image2.jpg',
    ],
    maxItems: 5,
  })
  images?: string[];

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;
}
