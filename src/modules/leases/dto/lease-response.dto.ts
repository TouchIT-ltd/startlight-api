import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeaseResponseDto {
  @ApiProperty({ example: 'mongo_1616161616_abcd1234' })
  id!: string;

  @ApiProperty({ example: 'mongo_1616161616_abcd1234' })
  userId!: string;

  @ApiProperty({ example: 'mongo_1616161616_abcd1235' })
  apartmentId!: string;

  @ApiProperty({ example: 'A101' })
  unitNumber!: string;

  @ApiProperty({ example: '2026-02-01' })
  startDate!: string;

  @ApiProperty({ example: '2027-02-01' })
  endDate!: string;

  @ApiProperty({ example: 1200 })
  rentAmount!: number;

  @ApiProperty({
    example: 'active',
    enum: ['active', 'pending', 'terminated', 'expired'],
  })
  status!: 'active' | 'pending' | 'terminated' | 'expired';

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../lease.pdf' })
  documentUrl?: string;

  @ApiProperty({ type: String })
  createdAt!: Date;

  @ApiProperty({ type: String })
  updatedAt!: Date;
}
