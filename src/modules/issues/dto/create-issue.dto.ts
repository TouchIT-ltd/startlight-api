import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIssueDto {


  @ApiProperty({ example: 'The kitchen sink is leaking and needs repair' })
  @IsString()
  description!: string;

  @ApiProperty({
    example: 'open',
    enum: ['open', 'in-progress', 'resolved', 'closed'],
  })
  @IsString()
  @IsIn(['open', 'in-progress', 'resolved', 'closed'])
  status!: 'open' | 'in-progress' | 'resolved' | 'closed';
}
