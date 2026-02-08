import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    type: 'string',
    format: 'email',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '1234',
    description: 'OTP code (4 digits)',
    type: 'string',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @Length(4, 4)
  otp!: string;
}
