import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvironmentConfig {
  // Server
  port: number;
  nodeEnv: string;
  
  // Database
  databaseUrl: string;
  
  // Redis
  redisUrl: string;
  
  // JWT
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  
  // CORS
  corsOrigin: string;
  
  // Email
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPass: string;
  emailFrom: string;
  
  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config: EnvironmentConfig = {
  // Server
  port: parseInt(process.env['PORT'] || '3001', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  
  // Database
  databaseUrl: process.env['DATABASE_URL']!,
  
  // Redis
  redisUrl: process.env['REDIS_URL']!,
  
  // JWT
  jwtSecret: process.env['JWT_SECRET']!,
  jwtRefreshSecret: process.env['JWT_REFRESH_SECRET']!,
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '15m',
  jwtRefreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
  
  // CORS
  corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  
  // Email
  emailHost: process.env['EMAIL_HOST'] || 'smtp.gmail.com',
  emailPort: parseInt(process.env['EMAIL_PORT'] || '587', 10),
  emailUser: process.env['EMAIL_USER'] || '',
  emailPass: process.env['EMAIL_PASS'] || '',
  emailFrom: process.env['EMAIL_FROM'] || 'SynergySphere <noreply@synergyphere.com>',
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
export const isTest = config.nodeEnv === 'test';