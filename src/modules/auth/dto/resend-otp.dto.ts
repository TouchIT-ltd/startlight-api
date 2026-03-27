import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsIn } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ['signup', 'password_reset'], example: 'signup' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['signup', 'password_reset'])
  purpose!: 'signup' | 'password_reset';
}
