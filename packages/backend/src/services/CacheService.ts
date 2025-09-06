import { createClient, RedisClientType } from 'redis';
import { config } from '../config/environment';

export class CacheService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  private async initialize(): Promise<void> {
    try {
      this.client = createClient({
        url: config.redisUrl,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              console.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * 100, 3000);
            console.log(`Redis: Reconnecting in ${delay}ms...`);
            return delay;
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis: Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis: Ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis: Reconnecting...');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Redis: Failed to initialize:', error);
      this.isConnected = false;
    }
  }

  /**
   * Ensure client is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.initialize();
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      await this.ensureConnected();
      if (!this.client) return;

      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureConnected();
      if (!this.client) return null;

      const value = await this.client.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.ensureConnected();
      if (!this.client) return;

      await this.client.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    try {
      await this.ensureConnected();
      if (!this.client || keys.length === 0) return;

      await this.client.del(keys);
    } catch (error) {
      console.error('Cache deleteMany error:', error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureConnected();
      if (!this.client) return false;

      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.ensureConnected();
      if (!this.client) return;

      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      await this.ensureConnected();
      if (!this.client) return 0;

      return await this.client.incr(key);
    } catch (error) {
      console.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number> {
    try {
      await this.ensureConnected();
      if (!this.client) return 0;

      return await this.client.decr(key);
    } catch (error) {
      console.error(`Cache decr error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Add to a set
   */
  async sAdd(key: string, members: string | string[]): Promise<void> {
    try {
      await this.ensureConnected();
      if (!this.client) return;

      const membersArray = Array.isArray(members) ? members : [members];
      await this.client.sAdd(key, membersArray);
    } catch (error) {
      console.error(`Cache sAdd error for key ${key}:`, error);
    }
  }

  /**
   * Remove from a set
   */
  async sRem(key: string, members: string | string[]): Promise<void> {
    try {
      await this.ensureConnected();
      if (!this.client) return;

      const membersArray = Array.isArray(members) ? members : [members];
      await this.client.sRem(key, membersArray);
    } catch (error) {
      console.error(`Cache sRem error for key ${key}:`, error);
    }
  }

  /**
   * Get all members of a set
   */
  async sMembers(key: string): Promise<string[]> {
    try {
      await this.ensureConnected();
      if (!this.client) return [];

      return await this.client.sMembers(key);
    } catch (error) {
      console.error(`Cache sMembers error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Check if member exists in set
   */
  async sIsMember(key: string, member: string): Promise<boolean> {
    try {
      await this.ensureConnected();
      if (!this.client) return false;

      return await this.client.sIsMember(key, member);
    } catch (error) {
      console.error(`Cache sIsMember error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set hash field
   */
  async hSet(key: string, field: string, value: any): Promise<void> {
    try {
      await this.ensureConnected();
      if (!this.client) return;

      await this.client.hSet(key, field, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache hSet error for key ${key}:`, error);
    }
  }

  /**
   * Get hash field
   */
  async hGet<T>(key: string, field: string): Promise<T | null> {
    try {
      await this.ensureConnected();
      if (!this.client) return null;

      const value = await this.client.hGet(key, field);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache hGet error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get all hash fields
   */
  async hGetAll<T>(key: string): Promise<Record<string, T>> {
    try {
      await this.ensureConnected();
      if (!this.client) return {};

      const hash = await this.client.hGetAll(key);
      const result: Record<string, T> = {};

      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value) as T;
        } catch {
          result[field] = value as any;
        }
      }

      return result;
    } catch (error) {
      console.error(`Cache hGetAll error for key ${key}:`, error);
      return {};
    }
  }

  /**
   * Delete hash field
   */
  async hDel(key: string, field: string | string[]): Promise<void> {
    try {
      await this.ensureConnected();
      if (!this.client) return;

      const fields = Array.isArray(field) ? field : [field];
      await this.client.hDel(key, fields);
    } catch (error) {
      console.error(`Cache hDel error for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      await this.ensureConnected();
      if (!this.client) return;

      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error(`Cache invalidatePattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async flushAll(): Promise<void> {
    try {
      await this.ensureConnected();
      if (!this.client) return;

      await this.client.flushAll();
      console.log('Cache: All data flushed');
    } catch (error) {
      console.error('Cache flushAll error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      await this.ensureConnected();
      if (!this.client) return null;

      const info = await this.client.info('stats');
      return info;
    } catch (error) {
      console.error('Cache getStats error:', error);
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        console.log('Redis: Connection closed');
      }
    } catch (error) {
      console.error('Redis close error:', error);
    }
  }

  /**
   * Cache wrapper for functions
   */
  async cacheable<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const result = await fn();
      await this.set(key, result, ttlSeconds);
      return result;
    } catch (error) {
      console.error(`Cacheable error for key ${key}:`, error);
      // Fallback to executing function without caching
      return await fn();
    }
  }

  /**
   * Rate limiting helper
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    try {
      await this.ensureConnected();
      if (!this.client) {
        return { allowed: true, remaining: limit, resetIn: 0 };
      }

      const current = await this.incr(key);
      
      if (current === 1) {
        await this.expire(key, windowSeconds);
      }

      const ttl = await this.client.ttl(key);
      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);

      return { allowed, remaining, resetIn: ttl };
    } catch (error) {
      console.error(`Rate limit error for key ${key}:`, error);
      return { allowed: true, remaining: limit, resetIn: 0 };
    }
  }
}

export default CacheService;
