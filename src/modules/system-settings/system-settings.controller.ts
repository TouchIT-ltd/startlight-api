import { Controller, Get, Put, Body } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettingsDto } from './dto/system-settings.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('system-settings')
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current system settings' })
  @ApiResponse({
    status: 200,
    description: 'Current system settings',
    type: SystemSettingsDto,
  })
  async getSettings() {
    return this.systemSettingsService.getSettings();
  }

  @Put()
  @ApiOperation({ summary: 'Update system settings' })
  @ApiResponse({
    status: 200,
    description: 'System settings updated',
    type: SystemSettingsDto,
  })
  async updateSettings(@Body() settings: SystemSettingsDto) {
    return this.systemSettingsService.updateSettings(settings);
  }
}