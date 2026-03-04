import { Controller, Get, Param, Patch, Body, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { QueueService } from './queue.service';
import { QueueStage, QueueStatus, UserRole } from '@prisma/client';

@ApiTags('Queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOperation({ summary: 'Get all queue items' })
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.WARD_CLERK, UserRole.LAB_TECH, UserRole.PHARMACIST)
  getAllQueue() {
    return this.queueService.getAllQueue();
  }

  @Get(':stage')
  @ApiOperation({ summary: 'Get queue by stage' })
  getQueueByStage(@Param('stage') stage: QueueStage) {
    return this.queueService.getQueueByStage(stage);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update queue item status' })
  updateStatus(@Param('id') id: string, @Body('status') status: QueueStatus) {
    return this.queueService.updateStatus(id, status);
  }

  @Post()
  @ApiOperation({ summary: 'Add visit to queue' })
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  addToQueue(
    @Body('visitId') visitId: string,
    @Body('stage') stage: QueueStage,
    @Body('notes') notes?: string,
    @Body('priority') priority?: number,
  ) {
    return this.queueService.addToQueue(visitId, stage, notes, priority);
  }

  @Patch(':id/priority')
  @ApiOperation({ summary: 'Set queue item priority' })
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  setPriority(@Param('id') id: string, @Body('priority') priority: number) {
    return this.queueService.setPriority(id, priority);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder queue items (doctor can reorder patients)' })
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  reorderQueue(@Body('queueIds') queueIds: string[]) {
    return this.queueService.reorderQueue(queueIds);
  }

  @Patch(':id/jump')
  @ApiOperation({ summary: 'Jump patient to front of queue' })
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  jumpQueue(@Param('id') id: string) {
    return this.queueService.jumpQueue(id);
  }
}
