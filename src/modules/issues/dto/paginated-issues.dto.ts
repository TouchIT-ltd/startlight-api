import { ApiProperty } from '@nestjs/swagger';
import { IssueResponseDto } from './issue-response.dto';

export class PaginatedIssuesDto {
  @ApiProperty({ type: [IssueResponseDto] })
  data!: IssueResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}
