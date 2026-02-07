# 🏥 Hospital Management System - Quick Start Card

## 🚀 Get Started in 3 Steps

### Step 1: Setup Database & Admin
```bash
cd apps/api
npm install
npm run prisma:migrate
npm run create-admin
```
**Output:** Admin account created
- Email: `admin@hospital.com`
- Password: `admin123`

### Step 2: Start Backend
```bash
npm run start:dev
```
**Running at:** http://localhost:3000

### Step 3: Start Frontend
```bash
cd ../web
npm install
npm run dev
```
**Running at:** http://localhost:3001

---

## 👤 Admin Tasks

### 1. Login as Admin
- Go to http://localhost:3001
- Email: `admin@hospital.com`
- Password: `admin123`

### 2. Add Hospital Staff
Click **"+ Add Staff Member"** and create accounts for:

| Role | Email Example | Suggested Password |
|------|--------------|-------------------|
| Receptionist | `reception@hospital.com` | `reception123` |
| Doctor | `doctor@hospital.com` | `doctor123` |
| Lab Tech | `lab@hospital.com` | `lab123` |
| Pharmacist | `pharmacy@hospital.com` | `pharmacy123` |
| Ward Clerk | `ward@hospital.com` | `ward123` |

**Important:** Share these credentials with respective staff members!

### 3. Staff Can Start Working
Each staff member:
1. Opens http://localhost:3001
2. Logs in with their credentials
3. Sees their role-specific dashboard

---

## 📋 Dashboard Features by Role

### 🎫 Receptionist
- Register new patients
- Search existing patients
- Create visits (Consultation/Injection/Review)
- Process M-Pesa payments
- View queue status

### 👨‍⚕️ Doctor
- View patient queue
- Conduct consultations
- Write prescriptions
- Order lab tests
- Admit patients to ward

### 🔬 Lab Technician
- View lab orders
- Capture samples
- Enter test results
- Upload attachments
- Send results to doctor

### 💊 Pharmacist
- View prescriptions
- Dispense medications
- Process payments
- Manage stock
- Low stock alerts

### 🏥 Ward Clerk
- Manage admissions
- Track inpatients
- Patient timeline
- Process discharge
- Billing & payments

---

## 💳 Payment Methods

### M-Pesa Setup (Optional)
Add to `apps/api/.env`:
```env
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
```

### Cash Payments
- No setup required
- Ready to use immediately

---

## 🔧 Common Commands

### Backend
```bash
cd apps/api

# Start development
npm run start:dev

# View database
npm run prisma:studio

# Reset database
npm run prisma:migrate reset

# Create new admin
npm run create-admin
```

### Frontend
```bash
cd apps/web

# Start development
npm run dev

# Build for production
npm run build

# Start production
npm start
```

---

## 🐛 Troubleshooting

### Database Issues
```bash
cd apps/api
npm run prisma:migrate reset
npm run create-admin
```

### Port Already in Use
**Backend (3000):**
- Change in `apps/api/src/main.ts`

**Frontend (3001):**
- Change in `apps/web/package.json` dev script

### Can't Login
1. Check database is running
2. Verify admin was created: `npm run create-admin`
3. Check browser console (F12)
4. Check API is running on port 3000

---

## 📊 Test the Complete Workflow

### Full Patient Journey:
1. **Reception:** Register patient → Create consultation visit
2. **Payment:** Process M-Pesa/Cash payment
3. **Doctor:** Conduct consultation → Create prescription
4. **Pharmacy:** Dispense medications → Process payment
5. **Complete!**

### With Lab Tests:
1. **Reception:** Register patient → Create visit
2. **Doctor:** Order lab tests
3. **Lab Tech:** Capture sample → Enter results
4. **Doctor:** View results → Create prescription
5. **Pharmacy:** Dispense medications

### With Admission:
1. **Reception:** Register patient → Create visit
2. **Doctor:** Admit to ward
3. **Ward Clerk:** Assign bed → Track patient
4. **Ward Clerk:** Process discharge payment

---

## 📞 Quick Reference

| Item | Value |
|------|-------|
| Frontend URL | http://localhost:3001 |
| Backend URL | http://localhost:3000 |
| API Docs | http://localhost:3000/api |
| Database UI | http://localhost:5555 |
| Admin Email | admin@hospital.com |
| Admin Password | admin123 |

---

## ✅ Checklist for Go-Live

- [ ] Database migrated
- [ ] Admin account created
- [ ] All staff accounts created
- [ ] Staff credentials shared
- [ ] M-Pesa configured (if using)
- [ ] All staff trained on their dashboards
- [ ] Test patient workflow completed
- [ ] Backup strategy in place

---

## 🎉 You're Ready!

Your Hospital Management System is fully configured and ready for use. Login as admin and start adding your staff members!

**Need Help?** Check:
- `DEPLOYMENT_GUIDE.md` - Detailed setup instructions
- `IMPLEMENTATION_SUMMARY.md` - Complete feature list
- Browser console (F12) for errors
- Backend logs in terminal
