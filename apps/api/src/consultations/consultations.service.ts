import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';

@Injectable()
export class ConsultationsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async create(createConsultationDto: CreateConsultationDto, doctorId: string) {
    // Invalidate consultation cache for this visit
    await this.cacheService.del(`consultations:visit:${createConsultationDto.visitId}`);
    
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
    const cacheKey = `consultations:visit:${visitId}`;
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const consultations = await this.prisma.consultation.findMany({
      where: { visitId },
      select: {
        id: true,
        notes: true,
        diagnosis: true,
        createdAt: true,
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Cache for 120 seconds
    await this.cacheService.set(cacheKey, consultations, 120);
    return consultations;
  }

  async update(id: string, updateData: any) {
    // Invalidate related caches
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      select: { visitId: true },
    });
    
    if (consultation) {
      await this.cacheService.del(`consultations:visit:${consultation.visitId}`);
    }
    
    return this.prisma.consultation.update({
      where: { id },
      data: updateData,
    });
  }
}
