import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@nestjs/passport';
import { PharmacyService } from './pharmacy.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
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
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get medicine stock' })
  getMedicineStock() {
    return this.pharmacyService.getMedicineStock();
  }

  @Patch('stock/:id')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update medicine stock' })
  updateStock(@Param('id') id: string, @Body('quantity') quantity: number) {
    return this.pharmacyService.updateStock(id, quantity);
  }

  @Post('stock')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add new medicine' })
  addMedicine(@Body() data: any) {
    return this.pharmacyService.addMedicine(data);
  }
}
