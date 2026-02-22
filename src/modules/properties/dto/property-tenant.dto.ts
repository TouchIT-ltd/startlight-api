import { ApiProperty } from '@nestjs/swagger';

export class PropertyTenantDto {
  @ApiProperty({ description: 'Tenant ID', example: 'mongo_1616161616_abcd1234' })
  id!: string;

  @ApiProperty({ description: 'Tenant full name', example: 'Sarah Smith' })
  fullname!: string;

  @ApiProperty({ description: 'Tenant email', example: 'sarah@email.com' })
  email?: string;

  @ApiProperty({ description: 'Tenant phone number', example: '08012345678' })
  phone?: string;

  @ApiProperty({ description: 'Unit number tenant occupies', example: 'A101' })
  unitNumber!: string;

  @ApiProperty({ description: 'Lease start date', example: '2024-01-01' })
  leaseStart?: string;

  @ApiProperty({ description: 'Lease end date', example: '2025-01-01' })
  leaseEnd?: string;

  @ApiProperty({ description: 'Lease status', example: 'active' })
  leaseStatus?: string;
}
