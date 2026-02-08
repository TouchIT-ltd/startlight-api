import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'John Doe Updated',
    description: 'Full name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullname?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
