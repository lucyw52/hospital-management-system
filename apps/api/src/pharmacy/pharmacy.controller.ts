import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PharmacyService } from './pharmacy.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateStockDto, UpdateStockDto } from './dto/stock.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Pharmacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Post('prescriptions')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Create prescription' })
  createPrescription(@Body() createPrescriptionDto: CreatePrescriptionDto, @CurrentUser() user: any) {
    return this.pharmacyService.createPrescription(createPrescriptionDto, user.id);
  }

  @Get('prescriptions')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all prescriptions' })
  getPrescriptions(@Query('status') status?: string) {
    return this.pharmacyService.getPrescriptions(status);
  }

  @Patch('prescriptions/:id')
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Update prescription' })
  updatePrescription(@Param('id') id: string, @Body() updateData: any) {
    return this.pharmacyService.updatePrescription(id, updateData);
  }

  @Get('queue')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get pharmacy queue' })
  getPharmacyQueue() {
    return this.pharmacyService.getPharmacyQueue();
  }

  @Patch('prescriptions/:id/dispense')
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Mark prescription as dispensed' })
  dispensePrescription(@Param('id') id: string) {
    return this.pharmacyService.dispensePrescription(id);
  }

  @Get('stock')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Get medicine stock' })
  getMedicineStock() {
    return this.pharmacyService.getMedicineStock();
  }

  @Patch('stock/:id')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update medicine stock' })
  updateStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.pharmacyService.updateStock(id, dto.quantity);
  }

  @Post('stock')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add new medicine' })
  addMedicine(@Body() dto: CreateStockDto) {
    return this.pharmacyService.addMedicine(dto);
  }
}