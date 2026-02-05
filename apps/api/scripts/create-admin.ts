import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Kapiesh123', 10);
    
    const admin = await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: 'hospitaladmin@gmail.com',
        phone: '+254712345678',
        role: UserRole.ADMIN,
        passwordHash: hashedPassword,
        isActive: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('-----------------------------------');
    
    console.log('-----------------------------------');
    console.log('⚠️  Please change the password after first login!');
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
