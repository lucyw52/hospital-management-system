import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LabService } from './lab.service';
import { CreateLabOrderDto, CreateLabResultDto } from './dto/create-lab-order.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Lab')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Post('orders')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Create lab order' })
  createOrder(@Body() createLabOrderDto: CreateLabOrderDto, @CurrentUser() user: any) {
    return this.labService.createOrder(createLabOrderDto, user.id);
  }

  @Get('queue')
  @Roles(UserRole.LAB_TECH, UserRole.DOCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get lab queue' })
  getLabQueue() {
    return this.labService.getLabQueue();
  }

  @Patch('orders/:id/status')
  @Roles(UserRole.LAB_TECH)
  @ApiOperation({ summary: 'Update lab order status' })
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.labService.updateOrderStatus(id, status);
  }

  @Post('results')
  @Roles(UserRole.LAB_TECH)
  @ApiOperation({ summary: 'Submit lab results' })
  createResult(@Body() createLabResultDto: CreateLabResultDto) {
    return this.labService.createResult(createLabResultDto);
  }

  @Get('results/visit/:visitId')
  @ApiOperation({ summary: 'Get lab results for a visit' })
  getResultsByVisit(@Param('visitId') visitId: string) {
    return this.labService.getResultsByVisit(visitId);
  }
}
