import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the notification',
    example: '507f1f77bcf86cd799439011',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the user who owns this notification',
    example: '507f1f77bcf86cd799439012',
  })
  userId!: string;

  @ApiProperty({
    description: 'Title of the notification',
    example: 'New Lease Agreement',
  })
  title!: string;

  @ApiProperty({
    description: 'Detailed message of the notification',
    example: 'Your lease agreement has been approved and is ready for download.',
  })
  message!: string;

  @ApiProperty({
    description: 'Type of notification',
    example: 'lease_approved',
    enum: ['lease_approved', 'lease_rejected', 'payment_due', 'maintenance_update', 'general'],
  })
  type!: string;

  @ApiProperty({
    description: 'Whether the notification has been read',
    example: false,
  })
  isRead!: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;
}