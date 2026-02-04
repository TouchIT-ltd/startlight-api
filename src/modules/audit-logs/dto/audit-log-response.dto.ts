import { ApiProperty } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the audit log entry',
    example: '507f1f77bcf86cd799439011',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the user who performed the action',
    example: '507f1f77bcf86cd799439012',
  })
  userId!: string;

  @ApiProperty({
    description: 'Type of action performed',
    example: 'user_login',
    enum: [
      'user_login',
      'user_logout',
      'user_created',
      'user_updated',
      'user_deleted',
      'property_created',
      'property_updated',
      'lease_created',
      'payment_processed',
      'document_uploaded',
      'issue_created',
      'issue_resolved',
    ],
  })
  action!: string;

  @ApiProperty({
    description: 'IP address of the user',
    example: '192.168.1.100',
  })
  ipAddress!: string;

  @ApiProperty({
    description: 'Additional details about the action',
    example: '{"targetUserId": "507f1f77bcf86cd799439013", "changes": {"email": "new@example.com"}}',
  })
  details?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;
}