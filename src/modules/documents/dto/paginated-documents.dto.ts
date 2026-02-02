import { ApiProperty } from '@nestjs/swagger';
import { DocumentResponseDto } from './document-response.dto';

export class PaginatedDocumentsDto {
  @ApiProperty({
    description: 'Array of documents',
    type: [DocumentResponseDto],
  })
  data!: DocumentResponseDto[];

  @ApiProperty({
    description: 'Total number of documents',
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