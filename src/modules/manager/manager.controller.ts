import { Controller, Get, Headers } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { ManagerDashboardDto } from './dto/manager-dashboard.dto';
import { OwnerDto } from './dto/owner.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('Manager Portal')
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

  @Get('owners')
  @ApiOperation({ summary: "Get owners' names related to this manager's properties" })
  @ApiHeader({ name: 'user-id', description: 'Manager user ID', required: true })
  @ApiResponse({ status: 200, description: "List of owners (id and fullname) for properties managed by this manager", type: [OwnerDto] })
  async getOwners(@Headers('user-id') managerId: string) {
    return this.managerService.getOwners(managerId);
  }
}