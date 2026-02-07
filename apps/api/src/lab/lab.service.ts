import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateLabOrderDto, CreateLabResultDto } from './dto/create-lab-order.dto';
import { QueueStage, InvoiceType } from '@prisma/client';

@Injectable()
export class LabService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async createOrder(createLabOrderDto: CreateLabOrderDto, doctorId: string) {
    // Invalidate caches
    await this.invalidateLabCaches();
    
    // Create lab order
    const labOrder = await this.prisma.labOrder.create({
      data: {
        visitId: createLabOrderDto.visitId,
        doctorId,
        testsJson: JSON.stringify(createLabOrderDto.tests),
        status: 'ORDERED',
      },
    });

    // Add to LAB queue
    await this.prisma.queueItem.create({
      data: {
        visitId: createLabOrderDto.visitId,
        stage: QueueStage.LAB,
        status: 'WAITING',
        notes: `Lab tests: ${createLabOrderDto.tests.join(', ')}`,
      },
    });

    // Create lab invoice (optional - can add pricing logic here)
    // await this.prisma.invoice.create({
    //   data: {
    //     visitId: createLabOrderDto.visitId,
    //     type: InvoiceType.LAB,
    //     amount: 500, // Example amount
    //     status: 'PENDING',
    //   },
    // });

    return labOrder;
  }

  async getLabQueue() {
    const cacheKey = 'lab:queue:active';
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const orders = await this.prisma.labOrder.findMany({
      where: {
        status: {
          in: ['ORDERED', 'SAMPLE_TAKEN'],
        },
      },
      select: {
        id: true,
        status: true,
        testsJson: true,
        createdAt: true,
        visit: {
          select: {
            id: true,
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Transform testsJson to tests array
    const result = orders.map(order => ({
      ...order,
      tests: JSON.parse(order.testsJson),
    }));

    // Cache for 60 seconds
    await this.cacheService.set(cacheKey, result, 60);
    return result;
  }

  async getLabOrders(status?: string) {
    const cacheKey = status ? `lab:orders:${status}` : 'lab:orders:all';
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const where = status ? { status: status as any } : {};
    const orders = await this.prisma.labOrder.findMany({
      where,
      select: {
        id: true,
        status: true,
        testsJson: true,
        createdAt: true,
        visit: {
          select: {
            id: true,
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
                gender: true,
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        labResults: {
          select: {
            id: true,
            resultsJson: true,
            attachmentUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform testsJson to tests array
    const result = orders.map(order => ({
      ...order,
      tests: JSON.parse(order.testsJson),
    }));

    // Cache for 90 seconds
    await this.cacheService.set(cacheKey, result, 90);
    return result;
  }

  async updateOrderStatus(id: string, status: string) {
    await this.invalidateLabCaches();
    
    return this.prisma.labOrder.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async createResult(createLabResultDto: CreateLabResultDto) {
    // Invalidate all caches
    await this.invalidateLabCaches();
    
    // Create lab result
    const labResult = await this.prisma.labResult.create({
      data: {
        labOrderId: createLabResultDto.labOrderId,
        resultsJson: JSON.stringify(createLabResultDto.results),
        attachmentUrl: createLabResultDto.attachmentUrl,
      },
    });

    // Update lab order status
    const labOrder = await this.prisma.labOrder.update({
      where: { id: createLabResultDto.labOrderId },
      data: { status: 'RESULTS_READY' },
      select: {
        id: true,
        visitId: true,
        visit: {
          select: {
            id: true,
          },
        },
      },
    });

    // Mark lab queue as done
    await this.prisma.queueItem.updateMany({
      where: {
        visitId: labOrder.visitId,
        stage: QueueStage.LAB,
      },
      data: {
        status: 'DONE',
      },
    });

    // Re-queue patient back to doctor with HIGH PRIORITY
    await this.prisma.queueItem.create({
      data: {
        visitId: labOrder.visitId,
        stage: QueueStage.DOCTOR,
        status: 'WAITING',
        priority: 100, // High priority for patients returning from lab
        notes: 'Lab results ready - returning to doctor for review',
      },
    });

    return labResult;
  }

  async getResultsByVisit(visitId: string) {
    const cacheKey = `lab:results:visit:${visitId}`;
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const orders = await this.prisma.labOrder.findMany({
      where: { visitId },
      select: {
        id: true,
        status: true,
        testsJson: true,
        createdAt: true,
        labResults: {
          select: {
            id: true,
            resultsJson: true,
            attachmentUrl: true,
            createdAt: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform testsJson to tests array
    const result = orders.map(order => ({
      ...order,
      tests: JSON.parse(order.testsJson),
    }));

    // Cache for 120 seconds (results are relatively static)
    await this.cacheService.set(cacheKey, result, 120);
    return result;
  }

  private async invalidateLabCaches() {
    // Invalidate all lab-related caches
    await this.cacheService.del('lab:queue:active');
    await this.cacheService.del('lab:orders:all');
    await this.cacheService.del('lab:orders:ORDERED');
    await this.cacheService.del('lab:orders:SAMPLE_TAKEN');
    await this.cacheService.del('lab:orders:RESULTS_READY');
    
    // Invalidate queue caches as they may be affected
    await this.cacheService.del('queue:all');
    await this.cacheService.del('queue:stage:LAB');
    await this.cacheService.del('queue:stage:DOCTOR');
  }
}
