import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { MpesaService } from './mpesa.service';

describe('PaymentsService - Webhook Idempotency', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    payment: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    queueItem: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockMpesaService = {
    initiateSTKPush: jest.fn(),
    querySTKStatus: jest.fn(),
    getAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MpesaService,
          useValue: mockMpesaService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleMpesaCallback', () => {
    const mockCheckoutRequestId = 'ws_CO_12345678';
    const mockCallbackData = {
      Body: {
        stkCallback: {
          CheckoutRequestID: mockCheckoutRequestId,
          ResultCode: 0,
          CallbackMetadata: {
            Item: [
              { Name: 'MpesaReceiptNumber', Value: 'ABC123456' },
            ],
          },
        },
      },
    };

    it('should process successful payment once (idempotency test)', async () => {
      const mockPayment = {
        id: 'payment-1',
        invoiceId: 'invoice-1',
        status: 'PENDING',
        mpesaCheckoutRequestId: mockCheckoutRequestId,
        invoice: {
          id: 'invoice-1',
          visitId: 'visit-1',
          type: 'CONSULTATION',
          visit: {
            id: 'visit-1',
          },
        },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({ ...mockPayment, status: 'SUCCESS' });
      mockPrismaService.invoice.update.mockResolvedValue({});
      mockPrismaService.queueItem.updateMany.mockResolvedValue({});
      mockPrismaService.queueItem.create.mockResolvedValue({});

      const result = await service.handleMpesaCallback(mockCallbackData);

      expect(result.message).toBe('Payment processed successfully');
      expect(mockPrismaService.payment.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: { status: 'PAID' },
      });
    });

    it('should skip processing if payment already processed (idempotency)', async () => {
      const mockPayment = {
        id: 'payment-1',
        invoiceId: 'invoice-1',
        status: 'SUCCESS', // Already processed
        mpesaCheckoutRequestId: mockCheckoutRequestId,
        invoice: {
          id: 'invoice-1',
          visitId: 'visit-1',
          type: 'CONSULTATION',
          visit: {
            id: 'visit-1',
          },
        },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.handleMpesaCallback(mockCallbackData);

      expect(result.message).toBe('Payment already processed');
      // Should not call update if already processed
      expect(mockPrismaService.payment.update).not.toHaveBeenCalled();
      expect(mockPrismaService.invoice.update).not.toHaveBeenCalled();
    });

    it('should handle multiple duplicate callbacks (idempotency)', async () => {
      const mockPayment = {
        id: 'payment-1',
        invoiceId: 'invoice-1',
        status: 'PENDING',
        mpesaCheckoutRequestId: mockCheckoutRequestId,
        invoice: {
          id: 'invoice-1',
          visitId: 'visit-1',
          type: 'CONSULTATION',
          visit: {
            id: 'visit-1',
          },
        },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({ ...mockPayment, status: 'SUCCESS' });
      mockPrismaService.invoice.update.mockResolvedValue({});
      mockPrismaService.queueItem.updateMany.mockResolvedValue({});
      mockPrismaService.queueItem.create.mockResolvedValue({});

      // First callback
      await service.handleMpesaCallback(mockCallbackData);

      // Update mock to return already processed payment
      mockPrismaService.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'SUCCESS',
      });

      // Second callback (duplicate)
      const result = await service.handleMpesaCallback(mockCallbackData);

      expect(result.message).toBe('Payment already processed');
    });

    it('should handle failed payment callback', async () => {
      const failedCallback = {
        Body: {
          stkCallback: {
            CheckoutRequestID: mockCheckoutRequestId,
            ResultCode: 1032, // Failed
          },
        },
      };

      const mockPayment = {
        id: 'payment-1',
        invoiceId: 'invoice-1',
        status: 'PENDING',
        mpesaCheckoutRequestId: mockCheckoutRequestId,
        invoice: {
          id: 'invoice-1',
          visitId: 'visit-1',
          type: 'CONSULTATION',
          visit: {
            id: 'visit-1',
          },
        },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({ ...mockPayment, status: 'FAILED' });

      const result = await service.handleMpesaCallback(failedCallback);

      expect(result.message).toBe('Payment failed');
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
          }),
        }),
      );
    });
  });
});
