import { IsString, MinLength, IsJWT } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT reset token received from verify-otp endpoint'
  })
  @IsJWT()
  resetToken!: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'New password (min 6 characters)',
    minLength: 6
  })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}