import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({
    description: 'ID of the user who owns this document',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    description: 'ID of the lease this document belongs to',
    example: '507f1f77bcf86cd799439013',
  })
  @IsString()
  leaseId!: string;

  @ApiProperty({
    description: 'Type of document',
    example: 'lease_agreement',
    enum: ['lease_agreement', 'id_proof', 'payment_receipt', 'maintenance_report', 'other'],
  })
  @IsString()
  @IsIn(['lease_agreement', 'id_proof', 'payment_receipt', 'maintenance_report', 'other'])
  type!: string;
}