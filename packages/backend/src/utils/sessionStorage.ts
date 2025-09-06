import { getRedisClient } from '../config/redis';
import { config } from '../config/environment';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  createdAt: number;
  lastActivity: number;
}

export class SessionStorage {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly REFRESH_TOKEN_PREFIX = 'refresh:';
  
  /**
   * Store session data in Redis
   */
  static async setSession(sessionId: string, sessionData: SessionData): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = this.SESSION_PREFIX + sessionId;
      
      // Store session data with expiration
      const sessionJson = JSON.stringify(sessionData);
      await redis.setEx(key, this.getSessionTTL(), sessionJson);
    } catch (error) {
      console.error('Error storing session:', error);
      throw new Error('Failed to store session');
    }
  }
  
  /**
   * Retrieve session data from Redis
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const redis = getRedisClient();
      const key = this.SESSION_PREFIX + sessionId;
      
      const sessionJson = await redis.get(key);
      if (!sessionJson) {
        return null;
      }
      
      const sessionData = JSON.parse(sessionJson) as SessionData;
      
      // Update last activity timestamp
      sessionData.lastActivity = Date.now();
      await this.setSession(sessionId, sessionData);
      
      return sessionData;
    } catch (error) {
      console.error('Error retrieving session:', error);
      return null;
    }
  }
  
  /**
   * Delete session from Redis
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = this.SESSION_PREFIX + sessionId;
      await redis.del(key);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error('Failed to delete session');
    }
  }
  
  /**
   * Store refresh token in Redis
   */
  static async setRefreshToken(tokenId: string, userId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = this.REFRESH_TOKEN_PREFIX + tokenId;
      
      // Store refresh token with expiration
      await redis.setEx(key, this.getRefreshTokenTTL(), userId);
    } catch (error) {
      console.error('Error storing refresh token:', error);
      throw new Error('Failed to store refresh token');
    }
  }
  
  /**
   * Retrieve user ID from refresh token
   */
  static async getRefreshToken(tokenId: string): Promise<string | null> {
    try {
      const redis = getRedisClient();
      const key = this.REFRESH_TOKEN_PREFIX + tokenId;
      
      return await redis.get(key);
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
      return null;
    }
  }
  
  /**
   * Delete refresh token from Redis
   */
  static async deleteRefreshToken(tokenId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = this.REFRESH_TOKEN_PREFIX + tokenId;
      await redis.del(key);
    } catch (error) {
      console.error('Error deleting refresh token:', error);
      throw new Error('Failed to delete refresh token');
    }
  }
  
  /**
   * Delete all sessions for a user (logout from all devices)
   */
  static async deleteAllUserSessions(userId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      
      // Find all session keys for the user
      const sessionKeys = await redis.keys(this.SESSION_PREFIX + '*');
      const userSessions: string[] = [];
      
      for (const key of sessionKeys) {
        const sessionJson = await redis.get(key);
        if (sessionJson) {
          const sessionData = JSON.parse(sessionJson) as SessionData;
          if (sessionData.userId === userId) {
            userSessions.push(key);
          }
        }
      }
      
      // Delete all user sessions
      if (userSessions.length > 0) {
        await redis.del(userSessions);
      }
    } catch (error) {
      console.error('Error deleting user sessions:', error);
      throw new Error('Failed to delete user sessions');
    }
  }
  
  /**
   * Get session TTL in seconds
   */
  private static getSessionTTL(): number {
    // Convert JWT expiration to seconds (default 15 minutes)
    const expiresIn = config.jwtExpiresIn;
    if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60;
    } else if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 3600;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 86400;
    }
    return 900; // Default 15 minutes
  }
  
  /**
   * Get refresh token TTL in seconds
   */
  private static getRefreshTokenTTL(): number {
    // Convert refresh token expiration to seconds (default 7 days)
    const expiresIn = config.jwtRefreshExpiresIn;
    if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60;
    } else if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 3600;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 86400;
    }
    return 604800; // Default 7 days
  }
}