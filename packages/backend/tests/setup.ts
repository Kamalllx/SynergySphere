// Test setup file
import { PrismaClient } from '@prisma/client';

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/synergy_sphere_test';
process.env['REDIS_URL'] = 'redis://localhost:6379/1';

// Create test database client
const prisma = new PrismaClient();

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global setup
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

// Clean up after each test
afterEach(async () => {
  // Clean up test data in reverse order of dependencies
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

// Global teardown
afterAll(async () => {
  // Disconnect from test database
  await prisma.$disconnect();
});

// Export test utilities
export { prisma as testPrisma };

// Mock console.log in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};