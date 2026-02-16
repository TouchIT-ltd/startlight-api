import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminDashboardDto } from './dto/admin-dashboard.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles, UserRole } from '../../shared/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Admin Portal')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get admin dashboard analytics',
    description: 'Access: ADMIN only - System-wide analytics and metrics'
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard data',
    type: AdminDashboardDto,
  })
  async getDashboard() {
    return this.adminService.getDashboard();
  }
}