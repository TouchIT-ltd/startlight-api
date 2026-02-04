import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SystemSettingsDto {
  @ApiProperty({
    description: 'Whether email alerts are enabled by default',
    example: true,
  })
  @IsBoolean()
  emailAlertsDefault!: boolean;

  @ApiProperty({
    description: 'Whether SMS notifications are enabled by default',
    example: false,
  })
  @IsBoolean()
  smsNotificationsDefault!: boolean;

  @ApiProperty({
    description: 'Whether push notifications are enabled by default',
    example: true,
  })
  @IsBoolean()
  pushNotificationsDefault!: boolean;

  @ApiPropertyOptional({
    description: 'Maximum file upload size in MB',
    example: 10,
  })
  @IsOptional()
  maxFileSizeMB?: number;

  @ApiPropertyOptional({
    description: 'System maintenance mode',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;
}