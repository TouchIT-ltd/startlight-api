import { Controller, Get, Headers } from '@nestjs/common';
import { OwnerService } from './owner.service';
import { OwnerDashboardDto } from './dto/owner-dashboard.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('owner')
@Controller('owner')
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get owner dashboard analytics' })
  @ApiHeader({ name: 'user-id', description: 'Owner user ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Owner dashboard data',
    type: OwnerDashboardDto,
  })
  async getDashboard(@Headers('user-id') ownerId: string) {
    return this.ownerService.getDashboard(ownerId);
  }
}