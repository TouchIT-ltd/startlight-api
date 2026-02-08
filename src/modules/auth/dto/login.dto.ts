import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    type: 'string',
    format: 'email',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'User password (min 6 characters)',
    type: 'string',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    example: 'device_token_xyz',
    description: 'Push notification device ID (optional)',
    type: 'string',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  pushNotificationId?: string;
}
