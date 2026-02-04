import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { QueueStage, InvoiceType } from '@prisma/client';

@Injectable()
export class AdmissionsService {
  constructor(private prisma: PrismaService) {}

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

    // Add to WARD queue
    await this.prisma.queueItem.create({
      data: {
        visitId: createAdmissionDto.visitId,
        stage: QueueStage.WARD,
        status: 'IN_PROGRESS',
        notes: `Admitted to ${createAdmissionDto.wardName}, Bed ${createAdmissionDto.bedNumber}`,
      },
    });

    // Mark doctor queue as done
    await this.prisma.queueItem.updateMany({
      where: {
        visitId: createAdmissionDto.visitId,
        stage: QueueStage.DOCTOR,
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
    return this.prisma.admission.update({
      where: { id },
      data: {
        status: 'DISCHARGED',
        dischargedAt: new Date(),
      },
    });
  }
}
