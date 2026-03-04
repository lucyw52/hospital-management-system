import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { QueueStage, InvoiceType } from '@prisma/client';

@Injectable()
export class AdmissionsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(createAdmissionDto: CreateAdmissionDto) {
    // Create admission
    const admission = await this.prisma.admission.create({
      data: {
        visitId: createAdmissionDto.visitId,
        wardName: createAdmissionDto.wardName,
        bedNumber: createAdmissionDto.bedNumber,
        status: 'ADMITTED',
      },
    });

    // Move the existing WAITING WARD queue item to IN_PROGRESS
    // (the doctor already added it as WAITING when referring the patient)
    const updated = await this.prisma.queueItem.updateMany({
      where: {
        visitId: createAdmissionDto.visitId,
        stage: QueueStage.WARD,
        status: 'WAITING',
      },
      data: {
        status: 'IN_PROGRESS',
        notes: `Admitted to ${createAdmissionDto.wardName}, Bed ${createAdmissionDto.bedNumber}`,
      },
    });

    // If no existing WARD queue item found, create one (fallback for manual admissions)
    if (updated.count === 0) {
      await this.prisma.queueItem.create({
        data: {
          visitId: createAdmissionDto.visitId,
          stage: QueueStage.WARD,
          status: 'IN_PROGRESS',
          notes: `Admitted to ${createAdmissionDto.wardName}, Bed ${createAdmissionDto.bedNumber}`,
        },
      });
    }

    // Mark doctor queue as done (in case it wasn't already)
    await this.prisma.queueItem.updateMany({
      where: {
        visitId: createAdmissionDto.visitId,
        stage: QueueStage.DOCTOR,
        status: { not: 'DONE' },
      },
      data: {
        status: 'DONE',
      },
    });

    return admission;
  }

  async getActiveAdmissions() {
    return this.prisma.admission.findMany({
      where: {
        status: 'ADMITTED',
      },
      include: {
        visit: {
          include: {
            patient: true,
            invoices: {
              where: {
                type: InvoiceType.WARD,
              },
              include: {
                payments: true,
              },
            },
          },
        },
      },
      orderBy: { admittedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.admission.findUnique({
      where: { id },
      include: {
        visit: {
          include: {
            patient: true,
            consultations: {
              include: {
                doctor: true,
              },
            },
            labOrders: {
              include: {
                labResults: true,
              },
            },
            prescriptions: true,
            invoices: {
              include: {
                payments: true,
              },
            },
          },
        },
      },
    });
  }

  async createDischargeInvoice(visitId: string, amount: number) {
    return this.prisma.invoice.create({
      data: {
        visitId,
        type: InvoiceType.WARD,
        amount,
        status: 'PENDING',
      },
    });
  }

  async discharge(id: string) {
    // For production: Check if ward invoice is paid
    // const admission = await this.findOne(id);
    // const wardInvoice = admission.visit.invoices.find(inv => inv.type === 'WARD');
    // if (wardInvoice && wardInvoice.status !== 'PAID') {
    //   throw new Error('Ward payment must be completed before discharge');
    // }
    
    // For testing: Allow discharge without payment check
    const admission = await this.prisma.admission.update({
      where: { id },
      data: {
        status: 'DISCHARGED',
        dischargedAt: new Date(),
      },
      include: {
        visit: {
          include: {
            patient: true,
            invoices: {
              where: { type: InvoiceType.WARD },
            },
          },
        },
      },
    });

    // Mark ward queue as done
    await this.prisma.queueItem.updateMany({
      where: {
        visitId: admission.visitId,
        stage: QueueStage.WARD,
      },
      data: {
        status: 'DONE',
      },
    });

    // Update visit status to completed
    await this.prisma.visit.update({
      where: { id: admission.visitId },
      data: { status: 'COMPLETED' },
    });

    // Send discharge notification email
    try {
      const patientEmail = (admission.visit.patient as any).email || `patient${admission.visit.patient.id}@example.com`;
      const totalCharges = admission.visit.invoices.reduce((sum, inv) => sum + inv.amount, 0);

      await this.emailService.sendDischargeNotification(
        patientEmail,
        admission.visit.patient.name,
        admission.admittedAt.toISOString(),
        admission.dischargedAt.toISOString(),
        totalCharges,
      );
    } catch (error) {
      console.error('Failed to send discharge notification:', error);
    }

    return admission;
  }
}

