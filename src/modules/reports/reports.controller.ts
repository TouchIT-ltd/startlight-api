import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('financial')
  @ApiOperation({ summary: 'Get financial report for a specific month' })
  @ApiQuery({ name: 'month', description: 'Month (1-12)', example: '2' })
  @ApiQuery({ name: 'year', description: 'Year', example: '2024' })
  @ApiQuery({ name: 'ownerId', description: 'Owner ID to filter properties', required: true })
  @ApiResponse({
    status: 200,
    description: 'Financial report generated',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async getFinancialReport(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('ownerId') ownerId: string,
    @Res() res: Response,
  ) {
    const reportBuffer = await this.reportsService.generateFinancialReport(
      parseInt(month),
      parseInt(year),
      ownerId,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=financial-report.pdf');
    res.send(reportBuffer);
  }

  @Get('occupancy')
  @ApiOperation({ summary: 'Get occupancy report for a specific quarter' })
  @ApiQuery({ name: 'quarter', description: 'Quarter (1-4)', example: '1' })
  @ApiQuery({ name: 'year', description: 'Year', example: '2024' })
  @ApiQuery({ name: 'ownerId', description: 'Owner ID to filter properties', required: true })
  @ApiResponse({
    status: 200,
    description: 'Occupancy report generated',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async getOccupancyReport(
    @Query('quarter') quarter: string,
    @Query('year') year: string,
    @Query('ownerId') ownerId: string,
    @Res() res: Response,
  ) {
    const reportBuffer = await this.reportsService.generateOccupancyReport(
      parseInt(quarter),
      parseInt(year),
      ownerId,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=occupancy-report.pdf');
    res.send(reportBuffer);
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Get maintenance report for a specific year' })
  @ApiQuery({ name: 'year', description: 'Year', example: '2024' })
  @ApiQuery({ name: 'ownerId', description: 'Owner ID to filter properties', required: true })
  @ApiResponse({
    status: 200,
    description: 'Maintenance report generated',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async getMaintenanceReport(
    @Query('year') year: string,
    @Query('ownerId') ownerId: string,
    @Res() res: Response,
  ) {
    const reportBuffer = await this.reportsService.generateMaintenanceReport(
      parseInt(year),
      ownerId,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=maintenance-report.pdf');
    res.send(reportBuffer);
  }

  @Get('tax-summary')
  @ApiOperation({ summary: 'Get tax summary report for a specific year' })
  @ApiQuery({ name: 'year', description: 'Year', example: '2024' })
  @ApiQuery({ name: 'ownerId', description: 'Owner ID to filter properties', required: true })
  @ApiResponse({
    status: 200,
    description: 'Tax summary report generated',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async getTaxSummaryReport(
    @Query('year') year: string,
    @Query('ownerId') ownerId: string,
    @Res() res: Response,
  ) {
    const reportBuffer = await this.reportsService.generateTaxSummaryReport(
      parseInt(year),
      ownerId,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=tax-summary-report.pdf');
    res.send(reportBuffer);
  }
}