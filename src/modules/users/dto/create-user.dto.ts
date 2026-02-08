import { IsEmail, IsString, MinLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsString()
  @MinLength(2)
  fullname!: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Password (min 6 characters)',
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  phoneNumber!: string;

  @ApiProperty({
    example: 'tenant',
    description: 'Role of the user',
    enum: ['tenant', 'manager', 'owner', 'admin'],
  })
  @IsIn(['tenant', 'manager', 'owner', 'admin'])
  role!: 'tenant' | 'manager' | 'owner' | 'admin';

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'NIN Slip Image/PDF',
    required: false,
  })
  ninSlip?: any; // Property for Swagger; actual file is handled by interceptor
}
