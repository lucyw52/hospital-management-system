import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { QueueStage, InvoiceType } from '@prisma/client';

@Injectable()
export class PharmacyService {
  constructor(private prisma: PrismaService) {}

  async createPrescription(createPrescriptionDto: CreatePrescriptionDto, doctorId: string) {
    // Calculate total amount
    const totalAmount = createPrescriptionDto.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create prescription
    const prescription = await this.prisma.prescription.create({
      data: {
        visitId: createPrescriptionDto.visitId,
        doctorId,
        itemsJson: JSON.stringify(createPrescriptionDto.items),
        status: 'PENDING',
      },
    });

    // Create pharmacy invoice
    await this.prisma.invoice.create({
      data: {
        visitId: createPrescriptionDto.visitId,
        type: InvoiceType.PHARMACY,
        amount: totalAmount,
        status: 'PENDING',
      },
    });

    // Add to PHARMACY queue
    await this.prisma.queueItem.create({
      data: {
        visitId: createPrescriptionDto.visitId,
        stage: QueueStage.PHARMACY,
        status: 'WAITING',
        notes: 'Prescription ready for dispensing',
      },
    });

    // Mark doctor queue as done
    await this.prisma.queueItem.updateMany({
      where: {
        visitId: createPrescriptionDto.visitId,
        stage: QueueStage.DOCTOR,
      },
      data: {
        status: 'DONE',
      },
    });

    return prescription;
  }

  async getPharmacyQueue() {
    return this.prisma.prescription.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        visit: {
          include: {
            patient: true,
            invoices: {
              where: {
                type: InvoiceType.PHARMACY,
              },
              include: {
                payments: true,
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
  }

  async dispensePrescription(id: string) {
    return this.prisma.prescription.update({
      where: { id },
      data: { status: 'DISPENSED' },
    });
  }

  async getMedicineStock() {
    return this.prisma.medicineStock.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async updateStock(id: string, quantity: number) {
    return this.prisma.medicineStock.update({
      where: { id },
      data: { quantity },
    });
  }

  async addMedicine(data: any) {
    return this.prisma.medicineStock.create({
      data,
    });
  }
}
