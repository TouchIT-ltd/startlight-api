import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { RentRulesService } from './rent-rules.service';
import { CreateRentRuleDto } from './dto/create-rent-rule.dto';
import { RentRuleResponseDto } from './dto/rent-rule-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('rent-rules')
@Controller('rent-rules')
export class RentRulesController {
  constructor(private readonly rentRulesService: RentRulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new rent rule for a property' })
  @ApiResponse({
    status: 201,
    description: 'Rent rule created successfully',
    type: RentRuleResponseDto,
  })
  async create(@Body() createRentRuleDto: CreateRentRuleDto) {
    return this.rentRulesService.create(createRentRuleDto);
  }

  @Get(':propertyId')
  @ApiOperation({ summary: 'Get rent rule for a specific property' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'Rent rule found',
    type: RentRuleResponseDto,
  })
  async findByPropertyId(@Param('propertyId') propertyId: string) {
    return this.rentRulesService.findByPropertyId(propertyId);
  }

  @Put(':propertyId')
  @ApiOperation({ summary: 'Update rent rule for a specific property' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({
    status: 200,
    description: 'Rent rule updated',
    type: RentRuleResponseDto,
  })
  async update(@Param('propertyId') propertyId: string, @Body() updateRentRuleDto: CreateRentRuleDto) {
    return this.rentRulesService.update(propertyId, updateRentRuleDto);
  }

  @Delete(':propertyId')
  @ApiOperation({ summary: 'Delete rent rule for a specific property' })
  @ApiParam({ name: 'propertyId', description: 'Property ID' })
  @ApiResponse({ status: 200, description: 'Rent rule deleted successfully' })
  async remove(@Param('propertyId') propertyId: string) {
    return this.rentRulesService.remove(propertyId);
  }
}