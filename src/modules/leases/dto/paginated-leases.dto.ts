import { ApiProperty } from '@nestjs/swagger';
import { LeaseResponseDto } from './lease-response.dto';

export class PaginatedLeasesDto {
  @ApiProperty({ type: [LeaseResponseDto] })
  data!: LeaseResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}
