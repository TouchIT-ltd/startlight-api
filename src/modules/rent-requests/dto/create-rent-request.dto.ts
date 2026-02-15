import { IsString, IsNumber, IsIn, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRentRequestDto {
  @ApiProperty({
    description: 'ID of the tenant making the request',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  tenantId!: string;

  @ApiProperty({
    description: 'ID of the property',
    example: '507f1f77bcf86cd799439010',
  })
  @IsString()
  propertyId!: string;

  @ApiProperty({
    description: 'ID of the unit being requested',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  unitId!: string;

  @ApiProperty({
    description: 'Reason for the request',
    example: 'Financial difficulties due to medical expenses',
  })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({
    description: 'Additional notes or details',
    example: 'Can pay remaining $600 by end of next month',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}