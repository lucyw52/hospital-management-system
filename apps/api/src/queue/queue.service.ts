import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueStage, QueueStatus } from '@prisma/client';

@Injectable()
export class QueueService {
  constructor(private prisma: PrismaService) {}

  async getQueueByStage(stage: QueueStage) {
    return this.prisma.queueItem.findMany({
      where: {
        stage,
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
      },
      include: {
        visit: {
          include: {
            patient: true,
            invoices: {
              include: {
                payments: true,
              },
            },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async updateStatus(id: string, status: QueueStatus) {
    return this.prisma.queueItem.update({
      where: { id },
      data: { status },
    });
  }

  async addToQueue(visitId: string, stage: QueueStage, notes?: string) {
    return this.prisma.queueItem.create({
      data: {
        visitId,
        stage,
        status: 'WAITING',
        notes,
      },
    });
  }

  async setPriority(id: string, priority: number) {
    return this.prisma.queueItem.update({
      where: { id },
      data: { priority },
    });
  }
}
