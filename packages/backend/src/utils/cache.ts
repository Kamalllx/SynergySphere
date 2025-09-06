import { getRedisClient } from '../config/redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
}

export class Cache {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly DEFAULT_PREFIX = 'cache:';
  
  /**
   * Set a value in cache with optional TTL
   */
  static async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    try {
      const redis = getRedisClient();
      const { ttl = this.DEFAULT_TTL, prefix = this.DEFAULT_PREFIX } = options;
      const cacheKey = prefix + key;
      
      const serializedValue = JSON.stringify(value);
      
      if (ttl > 0) {
        await redis.setEx(cacheKey, ttl, serializedValue);
      } else {
        await redis.set(cacheKey, serializedValue);
      }
    } catch (error) {
      console.error('Error setting cache:', error);
      throw new Error('Failed to set cache value');
    }
  }
  
  /**
   * Get a value from cache
   */
  static async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const redis = getRedisClient();
      const { prefix = this.DEFAULT_PREFIX } = options;
      const cacheKey = prefix + key;
      
      const value = await redis.get(cacheKey);
      if (!value) {
        return null;
      }
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }
  
  /**
   * Delete a value from cache
   */
  static async delete(key: string, options: CacheOptions = {}): Promise<void> {
    try {
      const redis = getRedisClient();
      const { prefix = this.DEFAULT_PREFIX } = options;
      const cacheKey = prefix + key;
      
      await redis.del(cacheKey);
    } catch (error) {
      console.error('Error deleting cache:', error);
      throw new Error('Failed to delete cache value');
    }
  }
  
  /**
   * Check if a key exists in cache
   */
  static async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const redis = getRedisClient();
      const { prefix = this.DEFAULT_PREFIX } = options;
      const cacheKey = prefix + key;
      
      const result = await redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error('Error checking cache existence:', error);
      return false;
    }
  }
  
  /**
   * Get or set pattern - retrieve from cache or compute and cache if not found
   */
  static async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        return cached;
      }
      
      // Compute the value
      const computed = await computeFn();
      
      // Store in cache
      await this.set(key, computed, options);
      
      return computed;
    } catch (error) {
      console.error('Error in getOrSet:', error);
      // If caching fails, still return the computed value
      return await computeFn();
    }
  }
  
  /**
   * Increment a numeric value in cache
   */
  static async increment(key: string, amount: number = 1, options: CacheOptions = {}): Promise<number> {
    try {
      const redis = getRedisClient();
      const { prefix = this.DEFAULT_PREFIX } = options;
      const cacheKey = prefix + key;
      
      return await redis.incrBy(cacheKey, amount);
    } catch (error) {
      console.error('Error incrementing cache:', error);
      throw new Error('Failed to increment cache value');
    }
  }
  
  /**
   * Set expiration time for an existing key
   */
  static async expire(key: string, ttl: number, options: CacheOptions = {}): Promise<void> {
    try {
      const redis = getRedisClient();
      const { prefix = this.DEFAULT_PREFIX } = options;
      const cacheKey = prefix + key;
      
      await redis.expire(cacheKey, ttl);
    } catch (error) {
      console.error('Error setting cache expiration:', error);
      throw new Error('Failed to set cache expiration');
    }
  }
  
  /**
   * Get multiple values from cache
   */
  static async getMultiple<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    try {
      const redis = getRedisClient();
      const { prefix = this.DEFAULT_PREFIX } = options;
      const cacheKeys = keys.map(key => prefix + key);
      
      const values = await redis.mGet(cacheKeys);
      
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Error getting multiple cache values:', error);
      return keys.map(() => null);
    }
  }
  
  /**
   * Set multiple values in cache
   */
  static async setMultiple(keyValuePairs: Record<string, any>, options: CacheOptions = {}): Promise<void> {
    try {
      const redis = getRedisClient();
      const { ttl = this.DEFAULT_TTL, prefix = this.DEFAULT_PREFIX } = options;
      
      const pipeline = redis.multi();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const cacheKey = prefix + key;
        const serializedValue = JSON.stringify(value);
        
        if (ttl > 0) {
          pipeline.setEx(cacheKey, ttl, serializedValue);
        } else {
          pipeline.set(cacheKey, serializedValue);
        }
      }
      
      await pipeline.exec();
    } catch (error) {
      console.error('Error setting multiple cache values:', error);
      throw new Error('Failed to set multiple cache values');
    }
  }
  
  /**
   * Clear all cache entries with a specific prefix
   */
  static async clearByPrefix(prefix: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const keys = await redis.keys(prefix + '*');
      
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error('Error clearing cache by prefix:', error);
      throw new Error('Failed to clear cache by prefix');
    }
  }
  
  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{ totalKeys: number; memoryUsage: string }> {
    try {
      const redis = getRedisClient();
      
      // Get total number of keys
      const info = await redis.info('keyspace');
      const keyspaceMatch = info.match(/keys=(\d+)/);
      const totalKeys = keyspaceMatch && keyspaceMatch[1] ? parseInt(keyspaceMatch[1]) : 0;
      
      // Get memory usage
      const memoryInfo = await redis.info('memory');
      const memoryMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch && memoryMatch[1] ? memoryMatch[1].trim() : 'Unknown';
      
      return { totalKeys, memoryUsage };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalKeys: 0, memoryUsage: 'Unknown' };
    }
  }
}

// Specialized cache utilities for common use cases

/**
 * User cache utilities
 */
export class UserCache {
  private static readonly PREFIX = 'user:';
  private static readonly TTL = 1800; // 30 minutes
  
  static async setUser(userId: string, userData: any): Promise<void> {
    return Cache.set(userId, userData, { prefix: this.PREFIX, ttl: this.TTL });
  }
  
  static async getUser<T = any>(userId: string): Promise<T | null> {
    return Cache.get<T>(userId, { prefix: this.PREFIX });
  }
  
  static async deleteUser(userId: string): Promise<void> {
    return Cache.delete(userId, { prefix: this.PREFIX });
  }
}

/**
 * Project cache utilities
 */
export class ProjectCache {
  private static readonly PREFIX = 'project:';
  private static readonly TTL = 3600; // 1 hour
  
  static async setProject(projectId: string, projectData: any): Promise<void> {
    return Cache.set(projectId, projectData, { prefix: this.PREFIX, ttl: this.TTL });
  }
  
  static async getProject<T = any>(projectId: string): Promise<T | null> {
    return Cache.get<T>(projectId, { prefix: this.PREFIX });
  }
  
  static async deleteProject(projectId: string): Promise<void> {
    return Cache.delete(projectId, { prefix: this.PREFIX });
  }
  
  static async setProjectMembers(projectId: string, members: any[]): Promise<void> {
    return Cache.set(`${projectId}:members`, members, { prefix: this.PREFIX, ttl: this.TTL });
  }
  
  static async getProjectMembers<T = any>(projectId: string): Promise<T[] | null> {
    return Cache.get<T[]>(`${projectId}:members`, { prefix: this.PREFIX });
  }
}

/**
 * Task cache utilities
 */
export class TaskCache {
  private static readonly PREFIX = 'task:';
  private static readonly TTL = 1800; // 30 minutes
  
  static async setTask(taskId: string, taskData: any): Promise<void> {
    return Cache.set(taskId, taskData, { prefix: this.PREFIX, ttl: this.TTL });
  }
  
  static async getTask<T = any>(taskId: string): Promise<T | null> {
    return Cache.get<T>(taskId, { prefix: this.PREFIX });
  }
  
  static async deleteTask(taskId: string): Promise<void> {
    return Cache.delete(taskId, { prefix: this.PREFIX });
  }
  
  static async setProjectTasks(projectId: string, tasks: any[]): Promise<void> {
    return Cache.set(`project:${projectId}:tasks`, tasks, { prefix: this.PREFIX, ttl: this.TTL });
  }
  
  static async getProjectTasks<T = any>(projectId: string): Promise<T[] | null> {
    return Cache.get<T[]>(`project:${projectId}:tasks`, { prefix: this.PREFIX });
  }
  
  static async invalidateProjectTasks(projectId: string): Promise<void> {
    return Cache.delete(`project:${projectId}:tasks`, { prefix: this.PREFIX });
  }
}