import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';

@Injectable()
export class ConsultationsService {
  constructor(private prisma: PrismaService) {}

  async create(createConsultationDto: CreateConsultationDto, doctorId: string) {
    // Create consultation
    const consultation = await this.prisma.consultation.create({
      data: {
        visitId: createConsultationDto.visitId,
        doctorId,
        notes: createConsultationDto.notes,
        diagnosis: createConsultationDto.diagnosis,
      },
    });

    // Update queue item to IN_PROGRESS or DONE
    await this.prisma.queueItem.updateMany({
      where: {
        visitId: createConsultationDto.visitId,
        stage: 'DOCTOR',
        status: 'WAITING',
      },
      data: {
        status: 'IN_PROGRESS',
      },
    });

    return consultation;
  }

  async findByVisit(visitId: string) {
    return this.prisma.consultation.findMany({
      where: { visitId },
      include: {
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

  async update(id: string, updateData: any) {
    return this.prisma.consultation.update({
      where: { id },
      data: updateData,
    });
  }
}
