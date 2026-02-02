import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto';

export class PaginatedNotificationsDto {
  @ApiProperty({
    description: 'Array of notifications',
    type: [NotificationResponseDto],
  })
  data!: NotificationResponseDto[];

  @ApiProperty({
    description: 'Total number of notifications',
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