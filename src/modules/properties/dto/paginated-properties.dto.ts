import { ApiProperty } from '@nestjs/swagger';
import { PropertyResponseDto } from './property-response.dto';

export class PaginatedPropertiesDto {
  @ApiProperty({
    description: 'Array of properties',
    type: [PropertyResponseDto],
  })
  data!: PropertyResponseDto[];

  @ApiProperty({
    description: 'Total number of properties',
    example: 25,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages!: number;
}