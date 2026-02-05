import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(createPatientDto: CreatePatientDto) {
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
    return this.prisma.patient.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' as any } },
          { phone: { contains: query } },
          { idNumber: { contains: query } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async findOne(id: string) {
    return this.prisma.patient.findUnique({
      where: { id },
      include: {
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async update(id: string, updateData: any) {
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...updateData,
        dob: updateData.dob ? new Date(updateData.dob) : undefined,
      },
    });
  }
}
