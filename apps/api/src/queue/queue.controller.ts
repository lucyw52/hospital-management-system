import { Controller, Get, Param, Patch, Body, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueService } from './queue.service';
import { QueueStage, QueueStatus } from '@prisma/client';

@ApiTags('Queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOperation({ summary: 'Get all queue items' })
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
  addToQueue(
    @Body('visitId') visitId: string,
    @Body('stage') stage: QueueStage,
    @Body('notes') notes?: string,
  ) {
    return this.queueService.addToQueue(visitId, stage, notes);
  }

  @Patch(':id/priority')
  @ApiOperation({ summary: 'Set queue item priority' })
  setPriority(@Param('id') id: string, @Body('priority') priority: number) {
    return this.queueService.setPriority(id, priority);
  }
}
