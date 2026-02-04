import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { VisitType, InvoiceType, QueueStage } from '@prisma/client';

@Injectable()
export class VisitsService {
  constructor(private prisma: PrismaService) {}

  async create(createVisitDto: CreateVisitDto, userId: string) {
    // Create visit
    const visit = await this.prisma.visit.create({
      data: {
        patientId: createVisitDto.patientId,
        visitType: createVisitDto.visitType,
        createdByUserId: userId,
        status: 'OPEN',
      },
      include: {
        patient: true,
      },
    });

    // Workflow logic based on visit type
    if (createVisitDto.visitType === VisitType.CONSULTATION) {
      // Create consultation invoice
      await this.prisma.invoice.create({
        data: {
          visitId: visit.id,
          type: InvoiceType.CONSULTATION,
          amount: 1500, // KES 1,500 consultation fee
          status: 'PENDING',
        },
      });

      // Create queue item at RECEPTION stage (waiting for payment)
      await this.prisma.queueItem.create({
        data: {
          visitId: visit.id,
          stage: QueueStage.RECEPTION,
          status: 'WAITING',
          notes: 'Waiting for consultation payment',
        },
      });
    } else if (createVisitDto.visitType === VisitType.INJECTION_FOLLOWUP) {
      // No payment required, directly enqueue to DOCTOR
      await this.prisma.queueItem.create({
        data: {
          visitId: visit.id,
          stage: QueueStage.DOCTOR,
          status: 'WAITING',
          notes: 'Injection follow-up - no payment required',
        },
      });
    } else if (createVisitDto.visitType === VisitType.REVIEW) {
      // Review visits go directly to doctor
      await this.prisma.queueItem.create({
        data: {
          visitId: visit.id,
          stage: QueueStage.DOCTOR,
          status: 'WAITING',
          notes: 'Review visit',
        },
      });
    }

    return visit;
  }

  async findAll(status?: string) {
    const where = status ? { status: status as any } : {};
    
    return this.prisma.visit.findMany({
      where,
      include: {
        patient: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        invoices: true,
        queueItems: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string) {
    return this.prisma.visit.findUnique({
      where: { id },
      include: {
        patient: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        invoices: {
          include: {
            payments: true,
          },
        },
        queueItems: {
          orderBy: { createdAt: 'desc' },
        },
        consultations: {
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        labOrders: {
          include: {
            labResults: true,
          },
        },
        prescriptions: true,
        admissions: true,
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.visit.update({
      where: { id },
      data: { status: status as any },
    });
  }
}
