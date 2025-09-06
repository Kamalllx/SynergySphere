// Unit test setup file (no database connection)

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/synergy_sphere_test';
process.env['REDIS_URL'] = 'redis://localhost:6379/1';

// Increase timeout for tests
jest.setTimeout(10000);

// Mock console.log in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};