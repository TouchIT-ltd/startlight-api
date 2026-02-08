import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'User password (min 6 characters)',
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    example: 'device_token_xyz',
    description: 'Push notification device ID (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  pushNotificationId?: string;
}
