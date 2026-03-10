import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { QueueStage, InvoiceType, InvoiceStatus } from '@prisma/client';

@Injectable()
export class PharmacyService {
  constructor(private prisma: PrismaService) {}

  async createPrescription(createPrescriptionDto: CreatePrescriptionDto, doctorId: string) {
    // Look up price for each medicine from stock and enrich items
    const enrichedItems = await Promise.all(
      createPrescriptionDto.items.map(async (item) => {
        const stock = await this.prisma.medicineStock.findFirst({
          where: { name: { equals: item.medicine, mode: 'insensitive' } },
        });
        return { ...item, price: stock?.price ?? 0 };
      }),
    );

    // Calculate total amount from stock prices
    const totalAmount = enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create prescription
    const prescription = await this.prisma.prescription.create({
      data: {
        visitId: createPrescriptionDto.visitId,
        doctorId,
        itemsJson: JSON.stringify(enrichedItems),
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

  async getPrescriptions(status?: string) {
    return this.prisma.prescription.findMany({
      where: status ? { status: status as any } : {},
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePrescription(id: string, updateData: any) {
    return this.prisma.prescription.update({
      where: { id },
      data: updateData,
    });
  }

  async dispensePrescription(id: string) {
    try {
      const prescription = await this.prisma.prescription.update({
        where: { id },
        data: { status: 'DISPENSED' },
        select: { id: true, visitId: true, itemsJson: true },
      });

      // Deduct dispensed quantities from stock
      // Handle both old format {name, frequency, duration} and new format {medicine, quantity}
      const rawItems: Array<Record<string, any>> = JSON.parse(prescription.itemsJson ?? '[]');
      await Promise.all(
        rawItems.map((item) => {
          const medicineName: string = item.medicine || item.name || '';
          const qty = Number(item.quantity) || 0;
          if (!medicineName || qty <= 0) return Promise.resolve();
          return this.prisma.medicineStock.updateMany({
            where: { name: { equals: medicineName, mode: 'insensitive' } },
            data: { quantity: { decrement: qty } },
          });
        }),
      );

      // Mark pharmacy invoice as PAID
      await this.prisma.invoice.updateMany({
        where: { visitId: prescription.visitId, type: InvoiceType.PHARMACY, status: InvoiceStatus.PENDING },
        data: { status: InvoiceStatus.PAID },
      });

      // Mark pharmacy queue as done
      await this.prisma.queueItem.updateMany({
        where: { visitId: prescription.visitId, stage: QueueStage.PHARMACY },
        data: { status: 'DONE' },
      });

      // Update visit status to completed
      await this.prisma.visit.update({
        where: { id: prescription.visitId },
        data: { status: 'COMPLETED' },
      });

      return prescription;
    } catch (error) {
      console.error('dispensePrescription error:', error);
      throw new InternalServerErrorException(
        error?.message ?? 'Failed to dispense prescription',
      );
    }
  }

  async getMedicineStock() {
    return this.prisma.medicineStock.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async updateStock(id: string, quantity: number) {
    try {
      return await this.prisma.medicineStock.update({
        where: { id },
        data: { quantity },
      });
    } catch (error) {
      console.error('updateStock error:', error);
      throw new InternalServerErrorException(error?.message ?? 'Failed to update stock');
    }
  }

  async addMedicine(data: { name: string; quantity: number; reorderLevel: number; price: number }) {
    try {
      return await this.prisma.medicineStock.create({
        data: {
          name: data.name,
          quantity: data.quantity,
          reorderLevel: data.reorderLevel,
          price: data.price,
        },
      });
    } catch (error) {
      console.error('addMedicine error:', error);
      if (error?.code === 'P2002') {
        throw new InternalServerErrorException(`Medicine "${data.name}" already exists in stock`);
      }
      throw new InternalServerErrorException(error?.message ?? 'Failed to add medicine');
    }
  }
}
