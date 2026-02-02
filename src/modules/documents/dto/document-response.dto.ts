import { ApiProperty } from '@nestjs/swagger';

export class DocumentResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the document',
    example: '507f1f77bcf86cd799439011',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the user who owns this document',
    example: '507f1f77bcf86cd799439012',
  })
  userId!: string;

  @ApiProperty({
    description: 'ID of the lease this document belongs to',
    example: '507f1f77bcf86cd799439013',
  })
  leaseId!: string;

  @ApiProperty({
    description: 'Type of document',
    example: 'lease_agreement',
    enum: ['lease_agreement', 'id_proof', 'payment_receipt', 'maintenance_report', 'other'],
  })
  type!: string;

  @ApiProperty({
    description: 'Original filename of the uploaded document',
    example: 'lease_agreement_jan2024.pdf',
  })
  fileName!: string;

  @ApiProperty({
    description: 'Cloudinary URL of the uploaded document',
    example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/documents/lease_123.pdf',
  })
  fileUrl!: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;
}