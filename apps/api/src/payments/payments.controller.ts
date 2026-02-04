import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment (initiate M-Pesa or record cash)' })
  @Roles(UserRole.RECEPTIONIST, UserRole.PHARMACIST, UserRole.WARD_CLERK, UserRole.ADMIN)
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Post('mpesa/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'M-Pesa callback endpoint (webhook)' })
  async mpesaCallback(@Body() callbackData: any) {
    console.log('M-Pesa callback received:', JSON.stringify(callbackData, null, 2));
    await this.paymentsService.handleMpesaCallback(callbackData);
    return {
      ResultCode: 0,
      ResultDesc: 'Success',
    };
  }

  @Get('invoice/:invoiceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for an invoice' })
  findByInvoice(@Param('invoiceId') invoiceId: string) {
    return this.paymentsService.findByInvoice(invoiceId);
  }

  @Get('mpesa/query/:checkoutRequestId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query M-Pesa payment status' })
  queryMpesaStatus(@Param('checkoutRequestId') checkoutRequestId: string) {
    return this.paymentsService.queryMpesaStatus(checkoutRequestId);
  }
}
