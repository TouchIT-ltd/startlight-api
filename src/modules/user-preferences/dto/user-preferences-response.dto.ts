import { ApiProperty } from '@nestjs/swagger';

export class UserPreferencesResponseDto {
  @ApiProperty({
    description: 'ID of the user',
    example: '507f1f77bcf86cd799439011',
  })
  userId!: string;

  @ApiProperty({
    description: 'Preferred language',
    example: 'en',
    enum: ['en', 'es', 'fr', 'de'],
  })
  language!: string;

  @ApiProperty({
    description: 'Whether dark mode is enabled',
    example: false,
  })
  darkMode!: boolean;

  @ApiProperty({
    description: 'Whether email notifications are enabled',
    example: true,
  })
  emailNotifications!: boolean;

  @ApiProperty({
    description: 'Whether SMS notifications are enabled',
    example: false,
  })
  smsNotifications!: boolean;

  @ApiProperty({
    description: 'Whether rent reminders are enabled',
    example: true,
  })
  rentReminders!: boolean;

  @ApiProperty({
    description: 'Whether maintenance updates are enabled',
    example: true,
  })
  maintenanceUpdates!: boolean;
}