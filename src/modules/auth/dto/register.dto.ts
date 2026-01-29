import { IsString, IsEmail, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export class RegisterDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address'
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name'
  })
  @IsString()
  fullName!: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Password (min 6 characters)',
    minLength: 6
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    example: 'user',
    description: 'User role',
    enum: UserRole,
    required: false
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}