import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabOrderDto, CreateLabResultDto } from './dto/create-lab-order.dto';
import { QueueStage, InvoiceType } from '@prisma/client';

@Injectable()
export class LabService {
  constructor(private prisma: PrismaService) {}

  async createOrder(createLabOrderDto: CreateLabOrderDto, doctorId: string) {
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
    return this.prisma.labOrder.findMany({
      where: {
        status: {
          in: ['ORDERED', 'SAMPLE_TAKEN'],
        },
      },
      include: {
        visit: {
          include: {
            patient: true,
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
  }

  async updateOrderStatus(id: string, status: string) {
    return this.prisma.labOrder.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async createResult(createLabResultDto: CreateLabResultDto) {
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
      include: { visit: true },
    });

    // Update queue item
    await this.prisma.queueItem.updateMany({
      where: {
        visitId: labOrder.visitId,
        stage: QueueStage.LAB,
      },
      data: {
        status: 'DONE',
      },
    });

    return labResult;
  }

  async getResultsByVisit(visitId: string) {
    return this.prisma.labOrder.findMany({
      where: { visitId },
      include: {
        labResults: true,
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
