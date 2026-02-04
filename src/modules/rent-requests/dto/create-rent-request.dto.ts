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
    description: 'ID of the lease this request relates to',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  leaseId!: string;

  @ApiProperty({
    description: 'Type of rent request',
    example: 'partial_payment',
    enum: ['partial_payment', 'payment_plan', 'extension', 'reduction', 'other'],
  })
  @IsString()
  @IsIn(['partial_payment', 'payment_plan', 'extension', 'reduction', 'other'])
  requestType!: string;

  @ApiProperty({
    description: 'Amount requested (for partial payments)',
    example: 600.00,
  })
  @IsNumber()
  @Min(0)
  requestedAmount!: number;

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