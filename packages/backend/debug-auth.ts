import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function debugAuth() {
  const email = 'debug@test.com';
  const password = 'Test123!';
  
  try {
    // Delete existing user if exists
    await prisma.user.deleteMany({
      where: { email }
    });
    
    // Create user with known password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password:', password);
    console.log('Hashed:', hashedPassword);
    
    const user = await prisma.user.create({
      data: {
        email,
        fullName: 'Debug User',
        passwordHash: hashedPassword,
        isActive: true
      }
    });
    
    console.log('Created user:', user);
    
    // Try to verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password verification:', isValid);
    
    // Try with wrong password
    const isInvalid = await bcrypt.compare('wrongpassword', user.passwordHash);
    console.log('Wrong password verification:', isInvalid);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();
