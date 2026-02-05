import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Consultations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Create consultation record' })
  create(@Body() createConsultationDto: CreateConsultationDto, @CurrentUser() user: any) {
    return this.consultationsService.create(createConsultationDto, user.id);
  }

  @Get('visit/:visitId')
  @ApiOperation({ summary: 'Get consultations for a visit' })
  findByVisit(@Param('visitId') visitId: string) {
    return this.consultationsService.findByVisit(visitId);
  }

  @Patch(':id')
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Update consultation' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.consultationsService.update(id, updateData);
  }
}
