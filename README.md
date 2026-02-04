# Hospital Management System (HMS)

A comprehensive Hospital Management System with Role-Based Access Control (RBAC) and workflow-driven patient journey management.

## 🏗️ Architecture

- **Backend**: NestJS (TypeScript), PostgreSQL, Prisma ORM, JWT auth, WebSockets
- **Frontend**: Next.js 14 (TypeScript), Tailwind CSS, shadcn/ui, TanStack Query
- **Payments**: M-Pesa STK Push integration with idempotent webhook handling
- **Real-time**: WebSocket for queue and payment updates

## 📦 Project Structure

```
hospital-management-system/
├── apps/
│   ├── api/           # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── patients/
│   │   │   ├── visits/
│   │   │   ├── payments/
│   │   │   ├── queue/
│   │   │   ├── consultations/
│   │   │   ├── lab/
│   │   │   ├── pharmacy/
│   │   │   ├── admissions/
│   │   │   └── websocket/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── test/
│   └── web/           # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── lib/
│       │   └── store/
│       └── public/
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and install dependencies**

```bash
cd /home/chemoget/Desktop/Kapiesh
npm install
cd apps/api && npm install
cd ../web && npm install
```

2. **Setup Backend Environment**

```bash
cd apps/api
cp .env.example .env
```

Edit `.env` and configure:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/hms_db?schema=public"
JWT_SECRET="your-secret-key-here"
MPESA_CONSUMER_KEY="your-key"
MPESA_CONSUMER_SECRET="your-secret"
# ... other M-Pesa config
```

3. **Setup Frontend Environment**

```bash
cd apps/web
cp .env.example .env
```

4. **Initialize Database**

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
npm run seed
```

This will create:
- All database tables
- Sample users for each role (password: `password123`)
  - admin@hms.com (Admin)
  - receptionist@hms.com (Receptionist)
  - doctor@hms.com (Doctor)
  - labtech@hms.com (Lab Technician)
  - pharmacist@hms.com (Pharmacist)
  - wardclerk@hms.com (Ward Clerk)
- Sample patients
- Sample medicine stock

5. **Run Development Servers**

```bash
# From root directory
npm run dev

# Or run separately:
npm run dev:api  # Backend on http://localhost:3001
npm run dev:web  # Frontend on http://localhost:3000
```

6. **Access the Application**

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/api
- **API Docs (Swagger)**: http://localhost:3001/api/docs
- **Prisma Studio**: `npm run studio` (in apps/api)

## 👥 User Roles & Permissions

### Admin
- Manage users
- View all system data
- Configure system settings

### Receptionist
- Register patients
- Create visits
- Manage payments (M-Pesa/Cash)
- View queue

### Doctor
- View doctor queue
- Create consultations
- Order lab tests
- Write prescriptions
- Admit patients

### Lab Technician
- View lab queue
- Capture samples
- Enter test results
- Upload attachments

### Pharmacist
- View pharmacy queue
- Dispense medications
- Collect payments
- Manage stock

### Ward Clerk
- Manage admissions
- View inpatients
- Process discharges
- Collect ward payments

## 🔄 Patient Journey Workflow

### 1. Reception Stage
- **Consultation Visit**: Create visit → Generate consultation invoice → M-Pesa payment → Queue to Doctor
- **Injection Follow-up**: Create visit → Queue directly to Doctor (no payment)
- **Review Visit**: Create visit → Queue to Doctor

### 2. Doctor Stage
- Conduct consultation
- Options:
  - Write prescription → Queue to Pharmacy
  - Order lab tests → Queue to Lab
  - Admit patient → Queue to Ward
  - Discharge (if review/follow-up)

### 3. Lab Stage (if ordered)
- Capture sample
- Enter results
- Doctor reviews → Can send to Pharmacy or Ward

### 4. Pharmacy Stage (if prescribed)
- Generate pharmacy invoice
- Collect payment (M-Pesa/Cash)
- Dispense medications
- Update stock

### 5. Ward Stage (if admitted)
- Inpatient care
- Daily monitoring
- Discharge process:
  - Generate ward invoice
  - Collect payment
  - Mark as discharged
  - Complete visit

## 💳 Payment Integration

### M-Pesa STK Push
- Initiate payment via phone
- Webhook callback handling
- **Idempotent processing** (duplicate callbacks ignored)
- Real-time status updates via WebSocket

### Cash Payments
- Direct recording
- Instant confirmation
- Receipt generation

### Payment Workflow
1. Generate invoice (CONSULTATION, PHARMACY, or WARD)
2. Initiate payment (M-Pesa or Cash)
3. Webhook callback (M-Pesa) or immediate (Cash)
4. Update invoice status
5. Trigger next workflow stage
6. Notify via WebSocket

## 📡 Real-time Features

WebSocket events:
- `queue_updated` - Queue changes for all stages
- `payment_updated` - Payment status changes
- `visit_status_updated` - Visit workflow updates

## 🧪 Testing

### Backend Tests

```bash
cd apps/api

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

Key test suites:
- **Webhook Idempotency**: Ensures duplicate M-Pesa callbacks don't double-process
- **RBAC Guards**: Validates role-based access control
- **Payment Workflow**: Tests complete payment cycle

## 📚 API Documentation

Once the backend is running, visit http://localhost:3001/api/docs for complete Swagger documentation.

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - User login

#### Patients
- `POST /api/patients` - Register patient
- `GET /api/patients?search=query` - Search patients
- `GET /api/patients/:id` - Get patient details

#### Visits
- `POST /api/visits` - Create visit
- `GET /api/visits` - List visits
- `GET /api/visits/:id` - Visit details

#### Payments
- `POST /api/payments` - Initiate payment
- `POST /api/payments/mpesa/callback` - M-Pesa webhook (external)
- `GET /api/payments/invoice/:invoiceId` - Get payments

#### Queue
- `GET /api/queue/:stage` - Get queue by stage (RECEPTION, DOCTOR, LAB, PHARMACY, WARD)
- `PATCH /api/queue/:id/status` - Update queue item

#### Lab
- `POST /api/lab/orders` - Create lab order
- `GET /api/lab/queue` - Lab queue
- `POST /api/lab/results` - Submit results

#### Pharmacy
- `POST /api/pharmacy/prescriptions` - Create prescription
- `GET /api/pharmacy/queue` - Pharmacy queue
- `GET /api/pharmacy/stock` - Medicine stock

#### Admissions
- `POST /api/admissions` - Admit patient
- `GET /api/admissions/active` - Active admissions
- `PATCH /api/admissions/:id/discharge` - Discharge patient

## 🎨 Frontend Structure

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── admin/
│   │   ├── receptionist/
│   │   ├── doctor/
│   │   ├── lab/
│   │   ├── pharmacy/
│   │   └── ward/
│   └── layout.tsx
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── dashboard/    # Role-specific components
│   └── shared/       # Shared components
├── lib/
│   ├── api-client.ts
│   └── utils.ts
└── store/
    └── auth-store.ts
```

## 🔐 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Route guards on both frontend and backend
- Secure password hashing (bcrypt)
- SQL injection prevention (Prisma ORM)
- XSS protection
- CORS configuration

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Reset database
cd apps/api
npx prisma migrate reset
npm run seed
```

### Port Already in Use
```bash
# Kill process on port 3001 (API)
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000 (Web)
lsof -ti:3000 | xargs kill -9
```

### M-Pesa Sandbox Issues
- Verify credentials in `.env`
- Check callback URL is publicly accessible (use ngrok for local dev)
- Test with Safaricom sandbox credentials

## 📝 Development Notes

### M-Pesa Payment (Demo Mode)
For development, you can use Cash payments which are processed immediately. M-Pesa integration requires:
1. Safaricom Daraja API credentials
2. Public callback URL (use ngrok)
3. Valid test phone numbers

### Adding New Roles
1. Update `UserRole` enum in `apps/api/prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev`
3. Add role to frontend types in `apps/web/src/store/auth-store.ts`
4. Create role-specific dashboard route

### Customizing Workflow
Modify workflow logic in:
- `apps/api/src/visits/visits.service.ts` - Visit creation
- `apps/api/src/payments/payments.service.ts` - Payment success handler
- `apps/api/src/queue/queue.service.ts` - Queue management

## 📄 License

MIT

## 👨‍💻 Author

Built as a comprehensive HMS solution with modern tech stack and best practices.

## 🙏 Acknowledgments

- NestJS team for excellent backend framework
- Next.js team for the frontend framework
- Shadcn for beautiful UI components
- Safaricom for M-Pesa API
