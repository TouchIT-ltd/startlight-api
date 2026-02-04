import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRentRuleDto {
  @ApiProperty({
    description: 'ID of the property this rule applies to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  propertyId!: string;

  @ApiProperty({
    description: 'Base rent amount',
    example: 1200.00,
  })
  @IsNumber()
  @Min(0)
  baseRent!: number;

  @ApiPropertyOptional({
    description: 'Late fee amount',
    example: 50.00,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lateFee?: number;

  @ApiPropertyOptional({
    description: 'Grace period in days',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gracePeriodDays?: number;

  @ApiPropertyOptional({
    description: 'Due day of the month',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  dueDayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'Additional rules or notes',
    example: 'No pets allowed, security deposit required',
  })
  @IsOptional()
  @IsString()
  additionalRules?: string;
}