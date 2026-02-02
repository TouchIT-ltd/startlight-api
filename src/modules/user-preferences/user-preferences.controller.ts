import {
  Controller,
  Get,
  Patch,
  Body,
  Request,
} from '@nestjs/common';
import { UserPreferencesService } from './user-preferences.service';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UserPreferencesResponseDto } from './dto/user-preferences-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('user-preferences')
@Controller('users/preferences')
export class UserPreferencesController {
  constructor(private readonly userPreferencesService: UserPreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiOkResponse({
    description: 'User preferences retrieved successfully',
    type: UserPreferencesResponseDto,
  })
  async findUserPreferences(@Request() req: any) {
    // In a real app, you'd get userId from JWT token or session
    // For now, we'll assume it's passed in the request or use a default
    const userId = req.user?.id || req.headers['user-id'] || 'default_user';
    return this.userPreferencesService.findByUserId(userId);
  }

  @Patch()
  @ApiBody({ type: UpdateUserPreferencesDto })
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({
    status: 200,
    description: 'User preferences updated successfully',
    type: UserPreferencesResponseDto,
  })
  async updateUserPreferences(
    @Body() dto: UpdateUserPreferencesDto,
    @Request() req: any,
  ) {
    // In a real app, you'd get userId from JWT token or session
    // For now, we'll assume it's passed in the request or use a default
    const userId = req.user?.id || req.headers['user-id'] || 'default_user';
    return this.userPreferencesService.update(userId, dto);
  }
}