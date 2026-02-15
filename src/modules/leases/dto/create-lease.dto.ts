import {
  IsString,
  IsNumber,
  IsDateString,
  IsIn,
  IsOptional,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaseDto {
  @ApiProperty({ example: 'mongo_1616161616_abcd1234' })
  @IsString()
  userId!: string;

  @ApiProperty({ example: 'mongo_1616161616_abcd1235' })
  @IsString()
  propertyId!: string;

  @ApiProperty({ example: 'A101' })
  @IsString()
  unitNumber!: string;

  @ApiProperty({ example: '2026-02-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-02-01' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 1200 })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(0)
  rentAmount!: number;

  @ApiProperty({
    example: 'active',
    enum: ['active', 'pending', 'terminated', 'expired'],
  })
  @IsString()
  @IsIn(['active', 'pending', 'terminated', 'expired'])
  status!: 'active' | 'pending' | 'terminated' | 'expired';
}
