import { ApiProperty } from '@nestjs/swagger';

export class IssueResponseDto {
  @ApiProperty({ example: 'mongo_1616161616_abcd1234' })
  id!: string;

  @ApiProperty({ example: 'mongo_1616161616_abcd1234' })
  userId!: string;

  @ApiProperty({ example: 'mongo_1616161616_abcd1235' })
  leaseId!: string;

  @ApiProperty({ example: 'The kitchen sink is leaking and needs repair' })
  description!: string;

  @ApiProperty({
    example: 'open',
    enum: ['open', 'in-progress', 'resolved', 'closed'],
  })
  status!: 'open' | 'in-progress' | 'resolved' | 'closed';

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;
}
