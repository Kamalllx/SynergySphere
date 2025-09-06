/**
 * Integration test for Redis functionality
 * This test requires Redis to be running locally
 * Run with: npm run test:integration
 */

import { createRedisClient, connectRedis, disconnectRedis, getRedisClient, isRedisConnected } from '../src/config/redis';
import { SessionStorage, SessionData } from '../src/utils/sessionStorage';
import { Cache } from '../src/utils/cache';

describe('Redis Integration Tests', () => {
  beforeAll(async () => {
    try {
      await connectRedis();
    } catch (error) {
      console.log('Redis not available, skipping integration tests');
      return;
    }
  });

  afterAll(async () => {
    if (isRedisConnected()) {
      await disconnectRedis();
    }
  });

  describe('Redis Connection', () => {
    it('should connect to Redis successfully', async () => {
      if (!isRedisConnected()) {
        console.log('Redis not available, skipping test');
        return;
      }
      
      expect(isRedisConnected()).toBe(true);
      
      const client = getRedisClient();
      const result = await client.ping();
      expect(result).toBe('PONG');
    });
  });

  describe('Session Storage Integration', () => {
    const testSessionId = 'integration-test-session';
    const testSessionData: SessionData = {
      userId: 'user-integration-test',
      email: 'integration@test.com',
      name: 'Integration Test User',
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    afterEach(async () => {
      if (isRedisConnected()) {
        await SessionStorage.deleteSession(testSessionId);
      }
    });

    it('should store and retrieve session data', async () => {
      if (!isRedisConnected()) {
        console.log('Redis not available, skipping test');
        return;
      }

      await SessionStorage.setSession(testSessionId, testSessionData);
      
      const retrievedSession = await SessionStorage.getSession(testSessionId);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.userId).toBe(testSessionData.userId);
      expect(retrievedSession?.email).toBe(testSessionData.email);
      expect(retrievedSession?.name).toBe(testSessionData.name);
    });
  });

  describe('Cache Integration', () => {
    const testKey = 'integration-test-key';
    const testValue = { id: 1, name: 'Integration Test Data', timestamp: Date.now() };

    afterEach(async () => {
      if (isRedisConnected()) {
        await Cache.delete(testKey);
      }
    });

    it('should store and retrieve cache data', async () => {
      if (!isRedisConnected()) {
        console.log('Redis not available, skipping test');
        return;
      }

      await Cache.set(testKey, testValue, { ttl: 60 });
      
      const retrievedValue = await Cache.get(testKey);
      expect(retrievedValue).toEqual(testValue);
    });

    it('should implement getOrSet pattern correctly', async () => {
      if (!isRedisConnected()) {
        console.log('Redis not available, skipping test');
        return;
      }

      let computeCallCount = 0;
      const computeFn = async () => {
        computeCallCount++;
        return { computed: true, callCount: computeCallCount };
      };

      // First call should compute and cache
      const result1 = await Cache.getOrSet(testKey, computeFn, { ttl: 60 });
      expect(result1.computed).toBe(true);
      expect(result1.callCount).toBe(1);
      expect(computeCallCount).toBe(1);

      // Second call should return cached value
      const result2 = await Cache.getOrSet(testKey, computeFn, { ttl: 60 });
      expect(result2.computed).toBe(true);
      expect(result2.callCount).toBe(1); // Same as first call
      expect(computeCallCount).toBe(1); // Compute function not called again
    });
  });
});