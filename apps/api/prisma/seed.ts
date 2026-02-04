import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create users for each role
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hms.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@hms.com',
      phone: '+254700000001',
      role: 'ADMIN',
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { email: 'receptionist@hms.com' },
    update: {},
    create: {
      name: 'Sarah Johnson',
      email: 'receptionist@hms.com',
      phone: '+254700000002',
      role: 'RECEPTIONIST',
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@hms.com' },
    update: {},
    create: {
      name: 'Dr. Michael Smith',
      email: 'doctor@hms.com',
      phone: '+254700000003',
      role: 'DOCTOR',
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  const labTech = await prisma.user.upsert({
    where: { email: 'labtech@hms.com' },
    update: {},
    create: {
      name: 'John Lab Tech',
      email: 'labtech@hms.com',
      phone: '+254700000004',
      role: 'LAB_TECH',
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  const pharmacist = await prisma.user.upsert({
    where: { email: 'pharmacist@hms.com' },
    update: {},
    create: {
      name: 'Emma Pharmacist',
      email: 'pharmacist@hms.com',
      phone: '+254700000005',
      role: 'PHARMACIST',
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  const wardClerk = await prisma.user.upsert({
    where: { email: 'wardclerk@hms.com' },
    update: {},
    create: {
      name: 'Nurse Sarah',
      email: 'wardclerk@hms.com',
      phone: '+254700000006',
      role: 'WARD_CLERK',
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  console.log('✅ Users created:', {
    admin: admin.email,
    receptionist: receptionist.email,
    doctor: doctor.email,
    labTech: labTech.email,
    pharmacist: pharmacist.email,
    wardClerk: wardClerk.email,
  });

  // Create sample patients
  const patient1 = await prisma.patient.upsert({
    where: { idNumber: '12345678' },
    update: {},
    create: {
      name: 'John Doe',
      phone: '+254712345678',
      dob: new Date('1990-05-15'),
      gender: 'MALE',
      idNumber: '12345678',
      address: '123 Main St, Nairobi',
      nextOfKinName: 'Jane Doe',
      nextOfKinPhone: '+254723456789',
    },
  });

  const patient2 = await prisma.patient.upsert({
    where: { idNumber: '87654321' },
    update: {},
    create: {
      name: 'Jane Smith',
      phone: '+254723456789',
      dob: new Date('1985-11-20'),
      gender: 'FEMALE',
      idNumber: '87654321',
      address: '456 Oak Ave, Nairobi',
      nextOfKinName: 'John Smith',
      nextOfKinPhone: '+254734567890',
    },
  });

  const patient3 = await prisma.patient.upsert({
    where: { idNumber: '11223344' },
    update: {},
    create: {
      name: 'Peter Kimani',
      phone: '+254734567890',
      dob: new Date('1978-03-10'),
      gender: 'MALE',
      idNumber: '11223344',
      address: '789 Elm Rd, Nairobi',
      nextOfKinName: 'Mary Kimani',
      nextOfKinPhone: '+254745678901',
    },
  });

  console.log('✅ Patients created:', {
    patient1: patient1.name,
    patient2: patient2.name,
    patient3: patient3.name,
  });

  // Create sample medicine stock
  const medicines = [
    { name: 'Paracetamol 500mg', quantity: 1000, reorderLevel: 200, price: 50 },
    { name: 'Amoxicillin 500mg', quantity: 500, reorderLevel: 100, price: 120 },
    { name: 'Metformin 500mg', quantity: 800, reorderLevel: 150, price: 80 },
    { name: 'Ibuprofen 400mg', quantity: 600, reorderLevel: 100, price: 60 },
    { name: 'Ciprofloxacin 500mg', quantity: 300, reorderLevel: 50, price: 150 },
  ];

  for (const medicine of medicines) {
    await prisma.medicineStock.upsert({
      where: { name: medicine.name },
      update: {},
      create: medicine,
    });
  }

  console.log('✅ Medicine stock created');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📧 Login credentials (password for all: password123):');
  console.log('- Admin: admin@hms.com');
  console.log('- Receptionist: receptionist@hms.com');
  console.log('- Doctor: doctor@hms.com');
  console.log('- Lab Tech: labtech@hms.com');
  console.log('- Pharmacist: pharmacist@hms.com');
  console.log('- Ward Clerk: wardclerk@hms.com');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
