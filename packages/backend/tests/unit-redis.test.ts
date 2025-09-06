import { SessionStorage, SessionData } from '../src/utils/sessionStorage';
import { Cache, UserCache, ProjectCache, TaskCache } from '../src/utils/cache';

// Mock Redis client
const mockRedisClient = {
  setEx: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  incrBy: jest.fn(),
  expire: jest.fn(),
  mGet: jest.fn(),
  multi: jest.fn(() => ({
    setEx: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  })),
  keys: jest.fn(),
  ping: jest.fn(),
  info: jest.fn(),
  isOpen: true,
};

// Mock the Redis configuration
jest.mock('../src/config/redis', () => ({
  getRedisClient: () => mockRedisClient,
  isRedisConnected: () => true,
  connectRedis: jest.fn(),
  disconnectRedis: jest.fn(),
}));

describe('Redis Utilities (Unit Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SessionStorage', () => {
    const testSessionId = 'test-session-123';
    const testSessionData: SessionData = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    describe('setSession', () => {
      it('should store session data with correct key and TTL', async () => {
        mockRedisClient.setEx.mockResolvedValue('OK');

        await SessionStorage.setSession(testSessionId, testSessionData);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `session:${testSessionId}`,
          900, // 15 minutes default TTL
          JSON.stringify(testSessionData)
        );
      });

      it('should handle Redis errors gracefully', async () => {
        mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

        await expect(SessionStorage.setSession(testSessionId, testSessionData))
          .rejects.toThrow('Failed to store session');
      });
    });

    describe('getSession', () => {
      it('should retrieve and update session data', async () => {
        const sessionJson = JSON.stringify(testSessionData);
        mockRedisClient.get.mockResolvedValue(sessionJson);
        mockRedisClient.setEx.mockResolvedValue('OK');

        const result = await SessionStorage.getSession(testSessionId);

        expect(mockRedisClient.get).toHaveBeenCalledWith(`session:${testSessionId}`);
        expect(result).toBeDefined();
        expect(result?.userId).toBe(testSessionData.userId);
        expect(result?.lastActivity).toBeGreaterThan(testSessionData.lastActivity);
      });

      it('should return null for non-existent session', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await SessionStorage.getSession('non-existent');

        expect(result).toBeNull();
      });

      it('should handle Redis errors gracefully', async () => {
        mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

        const result = await SessionStorage.getSession(testSessionId);

        expect(result).toBeNull();
      });
    });

    describe('deleteSession', () => {
      it('should delete session with correct key', async () => {
        mockRedisClient.del.mockResolvedValue(1);

        await SessionStorage.deleteSession(testSessionId);

        expect(mockRedisClient.del).toHaveBeenCalledWith(`session:${testSessionId}`);
      });
    });

    describe('refresh tokens', () => {
      const tokenId = 'refresh-token-123';
      const userId = 'user-123';

      it('should store refresh token', async () => {
        mockRedisClient.setEx.mockResolvedValue('OK');

        await SessionStorage.setRefreshToken(tokenId, userId);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `refresh:${tokenId}`,
          604800, // 7 days default TTL
          userId
        );
      });

      it('should retrieve refresh token', async () => {
        mockRedisClient.get.mockResolvedValue(userId);

        const result = await SessionStorage.getRefreshToken(tokenId);

        expect(mockRedisClient.get).toHaveBeenCalledWith(`refresh:${tokenId}`);
        expect(result).toBe(userId);
      });

      it('should delete refresh token', async () => {
        mockRedisClient.del.mockResolvedValue(1);

        await SessionStorage.deleteRefreshToken(tokenId);

        expect(mockRedisClient.del).toHaveBeenCalledWith(`refresh:${tokenId}`);
      });
    });
  });

  describe('Cache Utilities', () => {
    const testKey = 'test-key';
    const testValue = { id: 1, name: 'Test Data' };

    describe('set and get', () => {
      it('should set cache value with TTL', async () => {
        mockRedisClient.setEx.mockResolvedValue('OK');

        await Cache.set(testKey, testValue, { ttl: 1800 });

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `cache:${testKey}`,
          1800,
          JSON.stringify(testValue)
        );
      });

      it('should set cache value without TTL', async () => {
        mockRedisClient.set.mockResolvedValue('OK');

        await Cache.set(testKey, testValue, { ttl: 0 });

        expect(mockRedisClient.set).toHaveBeenCalledWith(
          `cache:${testKey}`,
          JSON.stringify(testValue)
        );
      });

      it('should get cache value', async () => {
        mockRedisClient.get.mockResolvedValue(JSON.stringify(testValue));

        const result = await Cache.get(testKey);

        expect(mockRedisClient.get).toHaveBeenCalledWith(`cache:${testKey}`);
        expect(result).toEqual(testValue);
      });

      it('should return null for non-existent key', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await Cache.get('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('exists', () => {
      it('should check if key exists', async () => {
        mockRedisClient.exists.mockResolvedValue(1);

        const result = await Cache.exists(testKey);

        expect(mockRedisClient.exists).toHaveBeenCalledWith(`cache:${testKey}`);
        expect(result).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        mockRedisClient.exists.mockResolvedValue(0);

        const result = await Cache.exists('non-existent');

        expect(result).toBe(false);
      });
    });

    describe('delete', () => {
      it('should delete cache key', async () => {
        mockRedisClient.del.mockResolvedValue(1);

        await Cache.delete(testKey);

        expect(mockRedisClient.del).toHaveBeenCalledWith(`cache:${testKey}`);
      });
    });

    describe('getOrSet', () => {
      it('should return cached value if exists', async () => {
        mockRedisClient.get.mockResolvedValue(JSON.stringify(testValue));
        const computeFn = jest.fn();

        const result = await Cache.getOrSet(testKey, computeFn);

        expect(result).toEqual(testValue);
        expect(computeFn).not.toHaveBeenCalled();
      });

      it('should compute and cache value if not exists', async () => {
        mockRedisClient.get.mockResolvedValue(null);
        mockRedisClient.setEx.mockResolvedValue('OK');
        const computeFn = jest.fn().mockResolvedValue(testValue);

        const result = await Cache.getOrSet(testKey, computeFn);

        expect(result).toEqual(testValue);
        expect(computeFn).toHaveBeenCalled();
        expect(mockRedisClient.setEx).toHaveBeenCalled();
      });
    });

    describe('increment', () => {
      it('should increment numeric value', async () => {
        mockRedisClient.incrBy.mockResolvedValue(5);

        const result = await Cache.increment(testKey, 5);

        expect(mockRedisClient.incrBy).toHaveBeenCalledWith(`cache:${testKey}`, 5);
        expect(result).toBe(5);
      });
    });

    describe('multiple operations', () => {
      it('should get multiple values', async () => {
        const keys = ['key1', 'key2', 'key3'];
        const values = [JSON.stringify({ id: 1 }), null, JSON.stringify({ id: 3 })];
        mockRedisClient.mGet.mockResolvedValue(values);

        const result = await Cache.getMultiple(keys);

        expect(mockRedisClient.mGet).toHaveBeenCalledWith(['cache:key1', 'cache:key2', 'cache:key3']);
        expect(result).toEqual([{ id: 1 }, null, { id: 3 }]);
      });

      it('should set multiple values', async () => {
        const keyValuePairs = { key1: { id: 1 }, key2: { id: 2 } };
        const mockPipeline = {
          setEx: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedisClient.multi.mockReturnValue(mockPipeline);

        await Cache.setMultiple(keyValuePairs, { ttl: 1800 });

        expect(mockPipeline.setEx).toHaveBeenCalledTimes(2);
        expect(mockPipeline.exec).toHaveBeenCalled();
      });
    });

    describe('statistics', () => {
      it('should get cache statistics', async () => {
        mockRedisClient.info
          .mockResolvedValueOnce('db0:keys=100,expires=50')
          .mockResolvedValueOnce('used_memory_human:2.5M');

        const stats = await Cache.getStats();

        expect(stats.totalKeys).toBe(100);
        expect(stats.memoryUsage).toBe('2.5M');
      });
    });
  });

  describe('Specialized Cache Utilities', () => {
    describe('UserCache', () => {
      const userId = 'user-123';
      const userData = { id: userId, name: 'Test User' };

      it('should set user data with correct prefix and TTL', async () => {
        mockRedisClient.setEx.mockResolvedValue('OK');

        await UserCache.setUser(userId, userData);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `user:${userId}`,
          1800, // 30 minutes
          JSON.stringify(userData)
        );
      });

      it('should get user data', async () => {
        mockRedisClient.get.mockResolvedValue(JSON.stringify(userData));

        const result = await UserCache.getUser(userId);

        expect(mockRedisClient.get).toHaveBeenCalledWith(`user:${userId}`);
        expect(result).toEqual(userData);
      });
    });

    describe('ProjectCache', () => {
      const projectId = 'project-123';
      const projectData = { id: projectId, name: 'Test Project' };
      const members = [{ userId: 'user-1', role: 'owner' }];

      it('should set project data', async () => {
        mockRedisClient.setEx.mockResolvedValue('OK');

        await ProjectCache.setProject(projectId, projectData);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `project:${projectId}`,
          3600, // 1 hour
          JSON.stringify(projectData)
        );
      });

      it('should set project members', async () => {
        mockRedisClient.setEx.mockResolvedValue('OK');

        await ProjectCache.setProjectMembers(projectId, members);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `project:${projectId}:members`,
          3600,
          JSON.stringify(members)
        );
      });
    });

    describe('TaskCache', () => {
      const taskId = 'task-123';
      const projectId = 'project-123';
      const taskData = { id: taskId, title: 'Test Task' };
      const projectTasks = [taskData];

      it('should set task data', async () => {
        mockRedisClient.setEx.mockResolvedValue('OK');

        await TaskCache.setTask(taskId, taskData);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `task:${taskId}`,
          1800, // 30 minutes
          JSON.stringify(taskData)
        );
      });

      it('should set project tasks', async () => {
        mockRedisClient.setEx.mockResolvedValue('OK');

        await TaskCache.setProjectTasks(projectId, projectTasks);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `task:project:${projectId}:tasks`,
          1800,
          JSON.stringify(projectTasks)
        );
      });

      it('should invalidate project tasks', async () => {
        mockRedisClient.del.mockResolvedValue(1);

        await TaskCache.invalidateProjectTasks(projectId);

        expect(mockRedisClient.del).toHaveBeenCalledWith(`task:project:${projectId}:tasks`);
      });
    });
  });
});