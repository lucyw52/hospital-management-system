# Hospital Management System - Complete Setup Guide

## ✅ All Dashboards Implemented

This HMS now includes all role-based dashboards matching your mockup UIs:

### 🎨 Frontend Dashboards
- ✅ **Admin Dashboard** - Staff management with add/activate/deactivate functionality
- ✅ **Receptionist Dashboard** - Patient registration, visit creation, queue management, M-Pesa payments
- ✅ **Doctor Dashboard** - Consultation workspace, prescriptions, lab orders, admissions
- ✅ **Lab Tech Dashboard** - Lab queue, sample capture, result entry with attachments
- ✅ **Pharmacist Dashboard** - Pharmacy queue, medication dispensing, stock management with low stock alerts
- ✅ **Ward Clerk Dashboard** - Admissions, inpatient management, discharge with timeline and billing

### 🔐 Admin Setup

#### 1. Create Initial Admin Account
```bash
cd apps/api
npm run create-admin
```

This creates an admin account with:
- **Email:** admin@hospital.com
- **Password:** admin123
- ⚠️ Change password after first login!

#### 2. Admin Can Add Staff
Once logged in as admin, you can:
- Navigate to Admin Dashboard
- Click "Add Staff Member"
- Create accounts for each role:
  - Receptionist
  - Doctor
  - Lab Technician
  - Pharmacist
  - Ward Clerk

### 🚀 Quick Start

#### Backend Setup
```bash
cd apps/api

# Install dependencies
npm install

# Setup database
npm run prisma:migrate
npm run prisma:generate

# Create admin account
npm run create-admin

# Start server
npm run start:dev
```

The API runs on `http://localhost:3000`

#### Frontend Setup
```bash
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev
```

The web app runs on `http://localhost:3001`

### 📋 Workflow Demo

#### 1. Reception Flow
1. Login as receptionist
2. Register new patient (or search existing)
3. Create visit (Consultation/Injection/Review)
4. For consultation → M-Pesa STK push initiated
5. Patient added to doctor queue upon payment

#### 2. Doctor Flow
1. View waiting patients in queue
2. Click "Start Consultation"
3. Add clinical notes and diagnosis
4. Choose action:
   - Send to Pharmacy (prescription)
   - Send to Lab (lab tests)
   - Admit to Ward
   - Discharge

#### 3. Lab Flow
1. View lab orders in queue
2. Capture sample
3. Enter results with measurements
4. Upload attachments (images/PDFs)
5. Submit → results available to doctor

#### 4. Pharmacy Flow
1. View pending prescriptions
2. Verify medications in stock
3. Dispense medications
4. Process payment (Cash/M-Pesa)
5. Mark as dispensed

#### 5. Ward Flow
1. View incoming admissions
2. Assign ward and bed
3. Track patient timeline
4. Calculate charges
5. Process payment and discharge

### 🔑 Default Credentials

After running `npm run create-admin`:
- **Admin:** admin@hospital.com / admin123

Admin then creates staff accounts for:
- **Receptionist:** receptionist@hospital.com
- **Doctor:** doctor@hospital.com
- **Lab Tech:** lab@hospital.com
- **Pharmacist:** pharmacy@hospital.com
- **Ward Clerk:** ward@hospital.com

### 📱 M-Pesa Integration

Configure M-Pesa credentials in `.env`:
```env
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback
```

### 🎯 Key Features Implemented

#### Backend APIs
- ✅ Patient registration & search
- ✅ Visit management (consultation, injection, review)
- ✅ Queue management with real-time updates
- ✅ M-Pesa STK Push integration
- ✅ Webhook callback with idempotency
- ✅ Consultation with prescriptions/lab orders
- ✅ Lab order & result management
- ✅ Pharmacy prescription dispensing
- ✅ Ward admission & discharge
- ✅ Payment processing (cash & M-Pesa)
- ✅ Role-based access control (RBAC)
- ✅ WebSocket for real-time notifications

#### Frontend Features
- ✅ Role-based dashboards
- ✅ Patient search with autocomplete
- ✅ Visit creation wizard
- ✅ Doctor consultation workspace
- ✅ Lab result entry forms
- ✅ Pharmacy stock management
- ✅ Ward patient timeline
- ✅ Payment processing UI
- ✅ Real-time queue updates
- ✅ Responsive design

### 📊 Database Models

All models implemented:
- User (with roles)
- Patient
- Visit
- Invoice
- Payment (with M-Pesa fields)
- QueueItem
- Consultation
- LabOrder & LabResult
- Prescription
- Admission

### 🔒 RBAC Permissions

- **Admin:** Manage all users, view all data
- **Receptionist:** Register patients, create visits, process payments
- **Doctor:** Consultations, prescriptions, lab orders, admissions
- **Lab Tech:** Lab sample capture, result entry
- **Pharmacist:** Dispense medications, manage stock
- **Ward Clerk:** Admissions, discharges, ward billing

### 🧪 Testing

```bash
# Backend tests
cd apps/api
npm test

# Test specific features
npm test -- auth.guard.spec
npm test -- payments.service.spec
```

### 📝 API Documentation

Swagger docs available at: `http://localhost:3000/api`

### 🐛 Troubleshooting

#### Database Connection
```bash
# Check Postgres is running
psql -U postgres

# Reset database
npm run prisma:migrate reset
```

#### M-Pesa Issues
- Verify credentials in `.env`
- Check callback URL is publicly accessible
- Test in sandbox environment first

#### Port Conflicts
```bash
# Change API port in apps/api/src/main.ts
# Change web port in apps/web/package.json
```

### 📧 Support

For issues or questions, check:
1. Console logs in browser (F12)
2. Backend logs in terminal
3. Database with `npm run prisma:studio`

---

## 🎉 All Features Complete!

Your HMS is now fully functional with all dashboards matching the mockup UIs. Login as admin and start adding staff members for each department!
