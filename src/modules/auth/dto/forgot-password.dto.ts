import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    type: 'string',
    format: 'email',
  })
  @IsEmail()
  email!: string;
}
