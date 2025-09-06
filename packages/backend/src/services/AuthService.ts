import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/environment';
import { UserModel } from '../models/User';
import { SessionStorage } from '../utils/sessionStorage';
import { EmailService } from './EmailService';
import { CacheService } from './CacheService';
import { 
  User, 
  CreateUserInput, 
  UpdateUserInput,
  UserWithRelations 
} from '../types/models';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  fullName: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface PasswordResetData {
  email: string;
}

export interface PasswordResetConfirmData {
  token: string;
  newPassword: string;
}

export class AuthService {
  private prisma: PrismaClient;
  private emailService: EmailService;
  private cacheService: CacheService;

  constructor() {
    this.prisma = new PrismaClient();
    this.emailService = new EmailService();
    this.cacheService = new CacheService();
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    // Check if email already exists
    const existingUser = await UserModel.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Create user
    const userData: CreateUserInput = {
      email: data.email,
      fullName: data.fullName,
      passwordHash: data.password, // Will be hashed in UserModel.create
    };

    const user = await UserModel.create(userData);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token
    await SessionStorage.setRefreshToken(tokens.refreshToken, user.id);

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail({
        email: user.email,
        name: user.fullName || user.email,
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail registration if email fails
    }

    return { user, tokens };
  }

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    // Find user by email
    const user = await UserModel.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(user, credentials.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token
    await SessionStorage.setRefreshToken(tokens.refreshToken, user.id);

    return { user, tokens };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as JwtPayload;
    
    // Check if refresh token exists in storage
    const storedUserId = await SessionStorage.getRefreshToken(refreshToken);
    if (!storedUserId || storedUserId !== decoded.userId) {
      throw new Error('Invalid refresh token');
    }

    // Get user
    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    // Update refresh token in storage
    await SessionStorage.deleteRefreshToken(refreshToken);
    await SessionStorage.setRefreshToken(tokens.refreshToken, user.id);

    return tokens;
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    if (refreshToken) {
      await SessionStorage.deleteRefreshToken(refreshToken);
    }
  }

  /**
   * Logout user from all devices
   */
  async logoutAllDevices(userId: string): Promise<void> {
    await SessionStorage.deleteAllUserSessions(userId);
  }

  /**
   * Verify access token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      
      // Check if user still exists and is active
      const user = await UserModel.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(data: PasswordResetData): Promise<void> {
    const user = await UserModel.findByEmail(data.email);
    if (!user) {
      // Don't reveal if email exists or not
      return;
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // Store reset token in cache
    await this.cacheService.set(`password_reset:${user.id}`, resetToken, 3600); // 1 hour

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        { email: user.email, name: user.fullName || user.email },
        resetToken
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(data: PasswordResetConfirmData): Promise<void> {
    try {
      // Verify reset token
      const decoded = jwt.verify(data.token, config.jwtSecret) as any;
      
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      // Check if reset token exists in cache
      const storedToken = await this.cacheService.get(`password_reset:${decoded.userId}`);
      if (!storedToken || storedToken !== data.token) {
        throw new Error('Invalid or expired reset token');
      }

      // Update password
      await UserModel.updatePassword(decoded.userId, data.newPassword);

      // Remove reset token from cache
      await this.cacheService.delete(`password_reset:${decoded.userId}`);

      // Invalidate all user sessions
      await this.logoutAllDevices(decoded.userId);

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Reset token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid reset token');
      }
      throw error;
    }
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await UserModel.verifyPassword(user, currentPassword);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    await UserModel.updatePassword(userId, newPassword);

    // Invalidate all user sessions except current one
    await this.logoutAllDevices(userId);
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserWithRelations | null> {
    return UserModel.findByIdWithRelations(userId);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, data: UpdateUserInput): Promise<User> {
    return UserModel.update(userId, data);
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string, password: string): Promise<void> {
    // Get user
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(user, password);
    if (!isValidPassword) {
      throw new Error('Password is incorrect');
    }

    // Deactivate account
    await UserModel.update(userId, { isActive: false });

    // Invalidate all user sessions
    await this.logoutAllDevices(userId);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.fullName || user.email,
    };

    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn,
    });

    // Calculate expiration time
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private isValidPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
