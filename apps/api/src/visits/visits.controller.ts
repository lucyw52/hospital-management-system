import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@nestjs/passport';
import { VisitsService } from './visits.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new visit' })
  create(@Body() createVisitDto: CreateVisitDto, @CurrentUser() user: any) {
    return this.visitsService.create(createVisitDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all visits' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('status') status?: string) {
    return this.visitsService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get visit by ID' })
  findOne(@Param('id') id: string) {
    return this.visitsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update visit status' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.visitsService.updateStatus(id, status);
  }
}
