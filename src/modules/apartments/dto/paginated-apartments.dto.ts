import { ApiProperty } from '@nestjs/swagger';
import { ApartmentResponseDto } from './apartment-response.dto';

export class PaginatedApartmentsDto {
  @ApiProperty({ type: [ApartmentResponseDto] })
  data!: ApartmentResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}
