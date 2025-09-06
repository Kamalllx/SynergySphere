import { createClient, RedisClientType } from 'redis';
import { config } from './environment';

// Redis client instance
let redisClient: RedisClientType | null = null;

// Create Redis client with connection handling
export const createRedisClient = (): RedisClientType => {
  const client = createClient({
    url: config.redisUrl,
    socket: {
      connectTimeout: 5000,
      lazyConnect: true,
    },
  });

  // Connection event handlers
  client.on('connect', () => {
    console.log('🔄 Redis client connecting...');
  });

  client.on('ready', () => {
    console.log('✅ Redis client connected successfully');
  });

  client.on('error', (error) => {
    console.error('❌ Redis client error:', error);
  });

  client.on('end', () => {
    console.log('🔌 Redis client connection ended');
  });

  client.on('reconnecting', () => {
    console.log('🔄 Redis client reconnecting...');
  });

  return client;
};

// Connect to Redis
export const connectRedis = async (): Promise<void> => {
  try {
    if (!redisClient) {
      redisClient = createRedisClient();
    }
    
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
};

// Disconnect from Redis
export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      console.log('✅ Redis disconnected successfully');
    }
  } catch (error) {
    console.error('❌ Redis disconnection failed:', error);
  } finally {
    redisClient = null;
  }
};

// Get Redis client instance
export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  
  if (!redisClient.isOpen) {
    throw new Error('Redis client not connected. Call connectRedis() first.');
  }
  
  return redisClient;
};

// Health check for Redis connection
export const isRedisConnected = (): boolean => {
  return redisClient !== null && redisClient.isOpen;
};

export { redisClient };