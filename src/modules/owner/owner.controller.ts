import { Controller, Get, Headers, Request, UseGuards } from '@nestjs/common';
import { OwnerService } from './owner.service';
import { OwnerDashboardDto } from './dto/owner-dashboard.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles, UserRole } from '../../shared/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('owner')
@Controller('owner')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get('dashboard')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get owner dashboard analytics' })
  @ApiHeader({ name: 'user-id', description: 'Owner user ID', required: false })
  @ApiResponse({
    status: 200,
    description: 'Owner dashboard data',
    type: OwnerDashboardDto,
  })
  async getDashboard(@Request() req: any, @Headers('user-id') ownerIdHeader?: string) {
    const ownerId = ownerIdHeader || req.user?.id;
    return this.ownerService.getDashboard(ownerId);
  }
}