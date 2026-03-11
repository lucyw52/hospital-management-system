import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  async create(createPatientDto: CreatePatientDto) {
    // Clear patient list cache
    await this.cacheService.delPattern('patients:*');
    
    return this.prisma.patient.create({
      data: {
        ...createPatientDto,
        dob: createPatientDto.dob ? new Date(createPatientDto.dob) : null,
      },
    });
  }

  async findAll(search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as any } },
            { phone: { contains: search } },
            { idNumber: { contains: search } },
          ],
        }
      : {};

    return this.prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async search(query: string) {
    const cacheKey = `patients:search:${query.toLowerCase()}`;
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    const results = await this.prisma.patient.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' as any } },
          { phone: { contains: query } },
          { idNumber: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        dob: true,
        gender: true,
        idNumber: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Cache search results for 120 seconds
    await this.cacheService.set(cacheKey, results, 120);
    return results;
  }

  async findOne(id: string) {
    const cacheKey = `patients:detail:${id}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        visits: {
          select: {
            id: true,
            visitType: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Cache patient details for 180 seconds (3 minutes)
    if (patient) {
      await this.cacheService.set(cacheKey, patient, 180);
    }
    return patient;
  }

  async update(id: string, updateData: any) {
    // Invalidate patient cache
    await this.cacheService.del(`patients:detail:${id}`);
    await this.cacheService.delPattern('patients:search:*');
    await this.cacheService.delPattern('patients:list:*');
    
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...updateData,
        dob: updateData.dob ? new Date(updateData.dob) : undefined,
      },
    });
  }

  async getPatientVisits(id: string) {
    return this.prisma.visit.findMany({
      where: { patientId: id },
      include: {
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
        prescriptions: {
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        invoices: {
          include: {
            payments: true,
          },
        },
        admissions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
