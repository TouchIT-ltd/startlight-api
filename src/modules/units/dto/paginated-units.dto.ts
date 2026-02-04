import { ApiProperty } from '@nestjs/swagger';
import { UnitResponseDto } from './unit-response.dto';

export class PaginatedUnitsDto {
  @ApiProperty({
    description: 'Array of units',
    type: [UnitResponseDto],
  })
  data!: UnitResponseDto[];

  @ApiProperty({
    description: 'Total number of units',
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