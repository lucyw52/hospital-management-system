import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { VisitType, InvoiceType, QueueStage } from '@prisma/client';

@Injectable()
export class VisitsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

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

    // Get patient email if available (you may need to add email field to Patient model)
    const patientEmail = (visit.patient as any).email || `patient${visit.patient.id}@example.com`;

    // TESTING MODE: Payments disabled - Queue all patients directly to doctor
    // For INJECTION_FOLLOWUP visits, they never needed payment anyway
    // For CONSULTATION visits, payment is disabled for testing
    
    const queueNote = createVisitDto.visitType === VisitType.INJECTION_FOLLOWUP
      ? 'Follow-up injection visit - no payment required'
      : 'Consultation visit - payment disabled for testing';
    
    const queueItem = await this.prisma.queueItem.create({
      data: {
        visitId: visit.id,
        stage: QueueStage.DOCTOR,
        status: 'WAITING',
        notes: queueNote,
        priority: createVisitDto.visitType === VisitType.INJECTION_FOLLOWUP ? 50 : 0, // Give slight priority to follow-ups
      },
    });

    // Send queue notification email
    try {
      await this.emailService.sendQueueNotification(
        patientEmail,
        visit.patient.name,
        1, // Queue number (you can calculate actual position)
        'DOCTOR',
      );
    } catch (error) {
      console.error('Failed to send queue notification:', error);
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
