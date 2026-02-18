import { ApiProperty } from '@nestjs/swagger';

export class OwnerDto {
  @ApiProperty({ description: 'Owner ID', example: 'owner_123' })
  id!: string;

  @ApiProperty({ description: 'Owner full name', example: 'Alice Owner' })
  fullname!: string;
}
