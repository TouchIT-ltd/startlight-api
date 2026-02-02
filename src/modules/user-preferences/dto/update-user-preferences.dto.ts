import { IsString, IsBoolean, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({
    description: 'Preferred language',
    example: 'en',
    enum: ['en', 'es', 'fr', 'de'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de'])
  language?: string;

  @ApiPropertyOptional({
    description: 'Whether dark mode is enabled',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @ApiPropertyOptional({
    description: 'Whether email notifications are enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Whether SMS notifications are enabled',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Whether rent reminders are enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  rentReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Whether maintenance updates are enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  maintenanceUpdates?: boolean;
}