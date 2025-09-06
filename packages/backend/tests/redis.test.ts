import { createRedisClient, connectRedis, disconnectRedis, getRedisClient, isRedisConnected } from '../src/config/redis';
import { SessionStorage, SessionData } from '../src/utils/sessionStorage';
import { Cache, UserCache, ProjectCache, TaskCache } from '../src/utils/cache';

describe('Redis Configuration', () => {
  beforeAll(async () => {
    await connectRedis();
  });

  afterAll(async () => {
    await disconnectRedis();
  });

  describe('Redis Connection', () => {
    it('should create a Redis client', () => {
      const client = createRedisClient();
      expect(client).toBeDefined();
    });

    it('should connect to Redis successfully', async () => {
      expect(isRedisConnected()).toBe(true);
    });

    it('should get Redis client instance', () => {
      const client = getRedisClient();
      expect(client).toBeDefined();
      expect(client.isOpen).toBe(true);
    });

    it('should perform basic Redis operations', async () => {
      const client = getRedisClient();
      
      // Set a test value
      await client.set('test:key', 'test-value');
      
      // Get the value
      const value = await client.get('test:key');
      expect(value).toBe('test-value');
      
      // Delete the value
      await client.del('test:key');
      
      // Verify deletion
      const deletedValue = await client.get('test:key');
      expect(deletedValue).toBeNull();
    });
  });
});  de
scribe('SessionStorage', () => {
    const testSessionId = 'test-session-123';
    const testSessionData: SessionData = {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    afterEach(async () => {
      // Clean up test data
      await SessionStorage.deleteSession(testSessionId);
    });

    it('should store and retrieve session data', async () => {
      await SessionStorage.setSession(testSessionId, testSessionData);
      
      const retrievedSession = await SessionStorage.getSession(testSessionId);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.userId).toBe(testSessionData.userId);
      expect(retrievedSession?.email).toBe(testSessionData.email);
      expect(retrievedSession?.name).toBe(testSessionData.name);
    });

    it('should update last activity when retrieving session', async () => {
      await SessionStorage.setSession(testSessionId, testSessionData);
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const retrievedSession = await SessionStorage.getSession(testSessionId);
      expect(retrievedSession?.lastActivity).toBeGreaterThan(testSessionData.lastActivity);
    });

    it('should return null for non-existent session', async () => {
      const session = await SessionStorage.getSession('non-existent-session');
      expect(session).toBeNull();
    });

    it('should delete session successfully', async () => {
      await SessionStorage.setSession(testSessionId, testSessionData);
      
      // Verify session exists
      let session = await SessionStorage.getSession(testSessionId);
      expect(session).toBeDefined();
      
      // Delete session
      await SessionStorage.deleteSession(testSessionId);
      
      // Verify session is deleted
      session = await SessionStorage.getSession(testSessionId);
      expect(session).toBeNull();
    });

    it('should store and retrieve refresh tokens', async () => {
      const tokenId = 'refresh-token-123';
      const userId = 'user-123';
      
      await SessionStorage.setRefreshToken(tokenId, userId);
      
      const retrievedUserId = await SessionStorage.getRefreshToken(tokenId);
      expect(retrievedUserId).toBe(userId);
      
      // Clean up
      await SessionStorage.deleteRefreshToken(tokenId);
    });

    it('should delete refresh token successfully', async () => {
      const tokenId = 'refresh-token-456';
      const userId = 'user-456';
      
      await SessionStorage.setRefreshToken(tokenId, userId);
      
      // Verify token exists
      let retrievedUserId = await SessionStorage.getRefreshToken(tokenId);
      expect(retrievedUserId).toBe(userId);
      
      // Delete token
      await SessionStorage.deleteRefreshToken(tokenId);
      
      // Verify token is deleted
      retrievedUserId = await SessionStorage.getRefreshToken(tokenId);
      expect(retrievedUserId).toBeNull();
    });
  });  
describe('Cache Utilities', () => {
    const testKey = 'test-cache-key';
    const testValue = { id: 1, name: 'Test Data', active: true };

    afterEach(async () => {
      // Clean up test data
      await Cache.delete(testKey);
    });

    it('should set and get cache values', async () => {
      await Cache.set(testKey, testValue);
      
      const retrievedValue = await Cache.get(testKey);
      expect(retrievedValue).toEqual(testValue);
    });

    it('should return null for non-existent cache key', async () => {
      const value = await Cache.get('non-existent-key');
      expect(value).toBeNull();
    });

    it('should check if cache key exists', async () => {
      await Cache.set(testKey, testValue);
      
      const exists = await Cache.exists(testKey);
      expect(exists).toBe(true);
      
      const notExists = await Cache.exists('non-existent-key');
      expect(notExists).toBe(false);
    });

    it('should delete cache values', async () => {
      await Cache.set(testKey, testValue);
      
      // Verify value exists
      expect(await Cache.exists(testKey)).toBe(true);
      
      // Delete value
      await Cache.delete(testKey);
      
      // Verify value is deleted
      expect(await Cache.exists(testKey)).toBe(false);
    });

    it('should implement getOrSet pattern', async () => {
      let computeCallCount = 0;
      const computeFn = async () => {
        computeCallCount++;
        return { computed: true, callCount: computeCallCount };
      };
      
      // First call should compute and cache
      const result1 = await Cache.getOrSet(testKey, computeFn);
      expect(result1.computed).toBe(true);
      expect(result1.callCount).toBe(1);
      expect(computeCallCount).toBe(1);
      
      // Second call should return cached value
      const result2 = await Cache.getOrSet(testKey, computeFn);
      expect(result2.computed).toBe(true);
      expect(result2.callCount).toBe(1); // Same as first call
      expect(computeCallCount).toBe(1); // Compute function not called again
    });

    it('should increment numeric values', async () => {
      const counterKey = 'test-counter';
      
      // Increment non-existent key (should start at 0)
      let value = await Cache.increment(counterKey, 5);
      expect(value).toBe(5);
      
      // Increment existing key
      value = await Cache.increment(counterKey, 3);
      expect(value).toBe(8);
      
      // Clean up
      await Cache.delete(counterKey);
    });

    it('should handle multiple cache operations', async () => {
      const keyValuePairs = {
        'key1': { id: 1, name: 'Item 1' },
        'key2': { id: 2, name: 'Item 2' },
        'key3': { id: 3, name: 'Item 3' },
      };
      
      // Set multiple values
      await Cache.setMultiple(keyValuePairs);
      
      // Get multiple values
      const keys = Object.keys(keyValuePairs);
      const values = await Cache.getMultiple(keys);
      
      expect(values).toHaveLength(3);
      expect(values[0]).toEqual(keyValuePairs.key1);
      expect(values[1]).toEqual(keyValuePairs.key2);
      expect(values[2]).toEqual(keyValuePairs.key3);
      
      // Clean up
      for (const key of keys) {
        await Cache.delete(key);
      }
    });

    it('should get cache statistics', async () => {
      const stats = await Cache.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalKeys).toBe('number');
      expect(typeof stats.memoryUsage).toBe('string');
    });
  });

  describe('Specialized Cache Utilities', () => {
    describe('UserCache', () => {
      const userId = 'user-123';
      const userData = { id: userId, name: 'Test User', email: 'test@example.com' };

      afterEach(async () => {
        await UserCache.deleteUser(userId);
      });

      it('should cache user data', async () => {
        await UserCache.setUser(userId, userData);
        
        const cachedUser = await UserCache.getUser(userId);
        expect(cachedUser).toEqual(userData);
      });

      it('should delete user cache', async () => {
        await UserCache.setUser(userId, userData);
        
        // Verify user is cached
        expect(await UserCache.getUser(userId)).toEqual(userData);
        
        // Delete user cache
        await UserCache.deleteUser(userId);
        
        // Verify user cache is deleted
        expect(await UserCache.getUser(userId)).toBeNull();
      });
    });

    describe('ProjectCache', () => {
      const projectId = 'project-123';
      const projectData = { id: projectId, name: 'Test Project', ownerId: 'user-123' };
      const members = [{ userId: 'user-1', role: 'owner' }, { userId: 'user-2', role: 'member' }];

      afterEach(async () => {
        await ProjectCache.deleteProject(projectId);
        await Cache.delete(`${projectId}:members`, { prefix: 'project:' });
      });

      it('should cache project data', async () => {
        await ProjectCache.setProject(projectId, projectData);
        
        const cachedProject = await ProjectCache.getProject(projectId);
        expect(cachedProject).toEqual(projectData);
      });

      it('should cache project members', async () => {
        await ProjectCache.setProjectMembers(projectId, members);
        
        const cachedMembers = await ProjectCache.getProjectMembers(projectId);
        expect(cachedMembers).toEqual(members);
      });
    });

    describe('TaskCache', () => {
      const taskId = 'task-123';
      const projectId = 'project-123';
      const taskData = { id: taskId, title: 'Test Task', projectId, status: 'todo' };
      const projectTasks = [taskData, { id: 'task-456', title: 'Another Task', projectId, status: 'done' }];

      afterEach(async () => {
        await TaskCache.deleteTask(taskId);
        await TaskCache.invalidateProjectTasks(projectId);
      });

      it('should cache task data', async () => {
        await TaskCache.setTask(taskId, taskData);
        
        const cachedTask = await TaskCache.getTask(taskId);
        expect(cachedTask).toEqual(taskData);
      });

      it('should cache project tasks', async () => {
        await TaskCache.setProjectTasks(projectId, projectTasks);
        
        const cachedTasks = await TaskCache.getProjectTasks(projectId);
        expect(cachedTasks).toEqual(projectTasks);
      });

      it('should invalidate project tasks cache', async () => {
        await TaskCache.setProjectTasks(projectId, projectTasks);
        
        // Verify tasks are cached
        expect(await TaskCache.getProjectTasks(projectId)).toEqual(projectTasks);
        
        // Invalidate cache
        await TaskCache.invalidateProjectTasks(projectId);
        
        // Verify cache is invalidated
        expect(await TaskCache.getProjectTasks(projectId)).toBeNull();
      });
    });
  });
});