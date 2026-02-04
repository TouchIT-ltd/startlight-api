import { Controller, Get, Headers } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { ManagerDashboardDto } from './dto/manager-dashboard.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('manager')
@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get manager dashboard analytics' })
  @ApiHeader({ name: 'user-id', description: 'Manager user ID', required: true })
  @ApiResponse({
    status: 200,
    description: 'Manager dashboard data',
    type: ManagerDashboardDto,
  })
  async getDashboard(@Headers('user-id') managerId: string) {
    return this.managerService.getDashboard(managerId);
  }
}