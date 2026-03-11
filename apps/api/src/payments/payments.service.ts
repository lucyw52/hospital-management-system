import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MpesaService } from './mpesa.service';
import { PaymentMethod, QueueStage, InvoiceType } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private mpesaService: MpesaService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto) {
    // Get invoice
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: createPaymentDto.invoiceId },
      include: {
        visit: {
          include: {
            patient: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already paid');
    }

    if (createPaymentDto.method === PaymentMethod.MPESA) {
      // Initiate M-Pesa STK Push
      if (!createPaymentDto.phoneNumber) {
        throw new BadRequestException('Phone number is required for M-Pesa payment');
      }

      const stkResult = await this.mpesaService.initiateSTKPush(
        createPaymentDto.phoneNumber,
        createPaymentDto.amount,
        invoice.id,
      );

      if (!stkResult.success) {
        throw new BadRequestException(
          stkResult.error ?? 'Failed to initiate M-Pesa payment',
        );
      }

      // Create payment record
      const payment = await this.prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          method: PaymentMethod.MPESA,
          amount: createPaymentDto.amount,
          status: 'PENDING',
          mpesaCheckoutRequestId: stkResult.checkoutRequestId,
        },
      });

      return {
        payment,
        checkoutRequestId: stkResult.checkoutRequestId,
        merchantRequestId: stkResult.merchantRequestId,
        message: 'M-Pesa STK push sent. Please check your phone.',
      };
    } else if (createPaymentDto.method === PaymentMethod.CASH) {
      // For cash payment, mark as success immediately (for demo purposes)
      const payment = await this.prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          method: PaymentMethod.CASH,
          amount: createPaymentDto.amount,
          status: 'SUCCESS',
        },
      });

      // Update invoice status
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID' },
      });

      // Handle workflow based on invoice type
      await this.handlePaymentSuccess(invoice, payment);

      return {
        payment,
        message: 'Cash payment recorded successfully',
      };
    }
  }

  async handleMpesaCallback(callbackData: any) {
    const checkoutRequestId = callbackData.Body?.stkCallback?.CheckoutRequestID;
    const resultCode = callbackData.Body?.stkCallback?.ResultCode;

    if (!checkoutRequestId) {
      console.error('Invalid callback data:', callbackData);
      return;
    }

    // Find payment by checkout request ID (idempotency check)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { mpesaCheckoutRequestId: checkoutRequestId },
      include: {
        invoice: {
          include: {
            visit: true,
          },
        },
      },
    });

    if (!existingPayment) {
      console.error('Payment not found for checkout request:', checkoutRequestId);
      return;
    }

    // Idempotency: if already processed, skip
    if (existingPayment.status !== 'PENDING') {
      console.log('Payment already processed:', checkoutRequestId);
      return { message: 'Payment already processed' };
    }

    // Store raw callback JSON
    const rawCallbackJson = JSON.stringify(callbackData);

    if (resultCode === 0) {
      // Success
      const callbackMetadata = callbackData.Body?.stkCallback?.CallbackMetadata?.Item || [];
      const mpesaReceipt = callbackMetadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;

      // Update payment
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: 'SUCCESS',
          mpesaReceipt,
          rawCallbackJson,
        },
      });

      // Update invoice
      await this.prisma.invoice.update({
        where: { id: existingPayment.invoiceId },
        data: { status: 'PAID' },
      });

      // Handle workflow
      await this.handlePaymentSuccess(existingPayment.invoice, existingPayment);

      return { message: 'Payment processed successfully' };
    } else {
      // Failed
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: 'FAILED',
          rawCallbackJson,
        },
      });

      return { message: 'Payment failed' };
    }
  }

  private async handlePaymentSuccess(invoice: any, payment: any) {
    const visit = invoice.visit;

    if (invoice.type === InvoiceType.CONSULTATION) {
      // RECEPTION paid → close reception queue, open doctor queue
      await this.prisma.queueItem.updateMany({
        where: { visitId: visit.id, stage: QueueStage.RECEPTION },
        data: { status: 'DONE' },
      });

      await this.prisma.queueItem.create({
        data: {
          visitId: visit.id,
          stage: QueueStage.DOCTOR,
          status: 'WAITING',
          notes: 'Consultation fee paid — awaiting doctor',
        },
      });
    } else if (invoice.type === InvoiceType.PHARMACY) {
      // PHARMACY paid → dispense all pending prescriptions for this visit
      const prescriptions = await this.prisma.prescription.findMany({
        where: { visitId: visit.id, status: 'PENDING' },
        select: { id: true, itemsJson: true },
      });

      // Deduct stock for each prescription
      for (const prescription of prescriptions) {
        const rawItems: Array<Record<string, any>> = JSON.parse(prescription.itemsJson ?? '[]');
        await Promise.all(
          rawItems.map(async (item) => {
            const medicineName: string = item.medicine || item.name || '';
            const qty = Number(item.quantity) || 0;
            if (!medicineName || qty <= 0) return Promise.resolve();
            
            // Check stock availability before deducting
            const stockItem = await this.prisma.medicineStock.findFirst({
              where: { name: { equals: medicineName, mode: 'insensitive' } },
            });
            
            if (stockItem) {
              if (stockItem.quantity < qty) {
                console.warn(`⚠️ Low stock warning: ${medicineName} - Requested: ${qty}, Available: ${stockItem.quantity}`);
              }
              // Deduct stock (Prisma decrement won't go below 0 automatically, but we log the warning)
              return this.prisma.medicineStock.updateMany({
                where: { name: { equals: medicineName, mode: 'insensitive' } },
                data: { quantity: { decrement: qty } },
              });
            } else {
              console.warn(`⚠️ Medicine not found in stock: ${medicineName}`);
              return Promise.resolve();
            }
          }),
        );
      }

      // Update prescription status to DISPENSED
      await this.prisma.prescription.updateMany({
        where: { visitId: visit.id, status: 'PENDING' },
        data: { status: 'DISPENSED' },
      });

      // Close the pharmacy queue item that was waiting for this payment
      await this.prisma.queueItem.updateMany({
        where: { visitId: visit.id, stage: QueueStage.PHARMACY, status: { in: ['WAITING', 'IN_PROGRESS'] } },
        data: { status: 'DONE' },
      });

      // Update visit status to COMPLETED
      await this.prisma.visit.update({
        where: { id: visit.id },
        data: { status: 'COMPLETED' },
      });
    } else if (invoice.type === InvoiceType.WARD) {
      // WARD paid → discharge the patient, close ward queue, complete visit
      await this.prisma.admission.updateMany({
        where: { visitId: visit.id, status: 'ADMITTED' },
        data: { status: 'DISCHARGED', dischargedAt: new Date() },
      });

      await this.prisma.queueItem.updateMany({
        where: { visitId: visit.id, stage: QueueStage.WARD },
        data: { status: 'DONE' },
      });

      await this.prisma.visit.update({
        where: { id: visit.id },
        data: { status: 'COMPLETED' },
      });
    } else if (invoice.type === InvoiceType.LAB) {
      // LAB paid → close the lab queue item so the tech can proceed
      await this.prisma.queueItem.updateMany({
        where: { visitId: visit.id, stage: QueueStage.LAB, status: { in: ['WAITING', 'IN_PROGRESS'] } },
        data: { status: 'DONE' },
      });
    }
  }

  async findByInvoice(invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async queryMpesaStatus(checkoutRequestId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { mpesaCheckoutRequestId: checkoutRequestId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const queryResult = await this.mpesaService.querySTKStatus(checkoutRequestId);

    // Sync local payment status with Daraja result where possible
    if (payment.status === 'PENDING') {
      if (queryResult.status === 'paid') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCESS' },
        });
        await this.prisma.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: 'PAID' },
        });
      } else if (
        queryResult.status === 'failed' ||
        queryResult.status === 'cancelled'
      ) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
      }
    }

    return {
      payment,
      status: queryResult.status,
      resultCode: queryResult.resultCode,
      resultDesc: queryResult.resultDesc,
      error: queryResult.error,
    };
  }
}
