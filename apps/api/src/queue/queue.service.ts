import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { QueueStage, QueueStatus } from '@prisma/client';

@Injectable()
export class QueueService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async getAllQueue() {
    // Try cache first
    const cacheKey = 'queue:all';
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const queue = await this.prisma.queueItem.findMany({
      where: {
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
      },
      select: {
        id: true,
        stage: true,
        status: true,
        priority: true,
        notes: true,
        createdAt: true,
        visit: {
          select: {
            id: true,
            visitType: true,
            status: true,
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
                gender: true,
              },
            },
            invoices: {
              select: {
                id: true,
                type: true,
                amount: true,
                status: true,
                payments: {
                  select: {
                    id: true,
                    method: true,
                    status: true,
                    amount: true,
                  },
                },
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

    // Cache for 60 seconds (increased from 30)
    await this.cacheService.set(cacheKey, queue, 60);
    return queue;
  }

  async getQueueByStage(stage: QueueStage) {
    const cacheKey = `queue:stage:${stage}`;
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const queue = await this.prisma.queueItem.findMany({
      where: {
        stage,
        status: {
          in: ['WAITING', 'IN_PROGRESS'],
        },
      },
      select: {
        id: true,
        stage: true,
        status: true,
        priority: true,
        notes: true,
        createdAt: true,
        visit: {
          select: {
            id: true,
            visitType: true,
            status: true,
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
                gender: true,
              },
            },
            invoices: {
              select: {
                id: true,
                type: true,
                amount: true,
                status: true,
                payments: {
                  select: {
                    id: true,
                    method: true,
                    status: true,
                    amount: true,
                  },
                },
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

    // Cache for 60 seconds (increased from 30)
    await this.cacheService.set(cacheKey, queue, 60);
    return queue;
  }

  async updateStatus(id: string, status: QueueStatus) {
    // Invalidate cache
    await this.invalidateCache();
    
    return this.prisma.queueItem.update({
      where: { id },
      data: { status },
    });
  }

  async addToQueue(visitId: string, stage: QueueStage, notes?: string, priority: number = 0) {
    await this.invalidateCache();
    
    return this.prisma.queueItem.create({
      data: {
        visitId,
        stage,
        status: 'WAITING',
        notes,
        priority,
      },
    });
  }

  async setPriority(id: string, priority: number) {
    await this.invalidateCache();
    
    return this.prisma.queueItem.update({
      where: { id },
      data: { priority },
    });
  }

  async reorderQueue(queueIds: string[]) {
    // Allow doctor to reorder queue by giving each item a priority based on position
    await this.invalidateCache();
    
    const updates = queueIds.map((id, index) => {
      return this.prisma.queueItem.update({
        where: { id },
        data: { priority: 1000 - index }, // Higher priority comes first
      });
    });

    await Promise.all(updates);
    return { success: true, message: 'Queue reordered successfully' };
  }

  async jumpQueue(id: string) {
    // Give this patient highest priority
    await this.invalidateCache();
    
    return this.prisma.queueItem.update({
      where: { id },
      data: { priority: 9999 },
    });
  }

  private async invalidateCache() {
    await this.cacheService.del('queue:all');
    // Invalidate all stage caches
    const stages = ['RECEPTION', 'DOCTOR', 'LAB', 'PHARMACY', 'WARD'];
    for (const stage of stages) {
      await this.cacheService.del(`queue:stage:${stage}`);
    }
  }
}
