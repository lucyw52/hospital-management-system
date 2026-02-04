import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findByVisit(visitId: string) {
    return this.prisma.invoice.findMany({
      where: { visitId },
      include: {
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        visit: {
          include: {
            patient: true,
          },
        },
        payments: true,
      },
    });
  }
}
