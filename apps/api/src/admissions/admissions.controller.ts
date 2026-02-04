import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@nestjs/passport';
import { AdmissionsService } from './admissions.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Admissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admissions')
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  @Post()
  @Roles(UserRole.DOCTOR, UserRole.WARD_CLERK)
  @ApiOperation({ summary: 'Create admission' })
  create(@Body() createAdmissionDto: CreateAdmissionDto) {
    return this.admissionsService.create(createAdmissionDto);
  }

  @Get('active')
  @Roles(UserRole.WARD_CLERK, UserRole.DOCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get active admissions' })
  getActiveAdmissions() {
    return this.admissionsService.getActiveAdmissions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admission by ID' })
  findOne(@Param('id') id: string) {
    return this.admissionsService.findOne(id);
  }

  @Post(':visitId/discharge-invoice')
  @Roles(UserRole.WARD_CLERK)
  @ApiOperation({ summary: 'Create discharge invoice' })
  createDischargeInvoice(@Param('visitId') visitId: string, @Body('amount') amount: number) {
    return this.admissionsService.createDischargeInvoice(visitId, amount);
  }

  @Patch(':id/discharge')
  @Roles(UserRole.WARD_CLERK)
  @ApiOperation({ summary: 'Discharge patient' })
  discharge(@Param('id') id: string) {
    return this.admissionsService.discharge(id);
  }
}
