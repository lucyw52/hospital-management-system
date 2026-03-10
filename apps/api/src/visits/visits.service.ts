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

    // Get patient email if available
    const patientEmail = (visit.patient as any).email || `patient${visit.patient.id}@example.com`;

    // INJECTION_FOLLOWUP visits are free — go straight to DOCTOR queue.
    // CONSULTATION and REVIEW visits require the consultation fee to be paid
    // at reception first; the patient enters the RECEPTION queue and the
    // receptionist creates a CONSULTATION invoice.  Once that invoice is
    // paid, payments.service moves them to the DOCTOR queue automatically.
    const isFollowUp = createVisitDto.visitType === VisitType.INJECTION_FOLLOWUP;

    const queueItem = await this.prisma.queueItem.create({
      data: {
        visitId: visit.id,
        stage: isFollowUp ? QueueStage.DOCTOR : QueueStage.RECEPTION,
        status: 'WAITING',
        notes: isFollowUp
          ? 'Injection follow-up — no consultation fee required'
          : 'Awaiting consultation fee payment at reception',
        priority: isFollowUp ? 50 : 0,
      },
    });

    // Create consultation invoice for non-followup visits (KSh 100)
    if (!isFollowUp) {
      await this.prisma.invoice.create({
        data: {
          visitId: visit.id,
          type: InvoiceType.CONSULTATION,
          amount: 100,
          status: 'PENDING',
        },
      });
    }

    // Send queue notification email
    try {
      await this.emailService.sendQueueNotification(
        patientEmail,
        visit.patient.name,
        1,
        isFollowUp ? 'DOCTOR' : 'RECEPTION',
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
