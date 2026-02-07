import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { VisitsModule } from './visits/visits.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { QueueModule } from './queue/queue.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { LabModule } from './lab/lab.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { WebsocketModule } from './websocket/websocket.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CacheModule,
    EmailModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    VisitsModule,
    PaymentsModule,
    QueueModule,
    ConsultationsModule,
    LabModule,
    PharmacyModule,
    AdmissionsModule,
    InvoicesModule,
    WebsocketModule,
  ],
})
export class AppModule {}
