import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import {
  User,
  UserWithRelations,
  CreateUserInput,
  UpdateUserInput,
  UserFilters
} from '../types/models';

export class UserModel {
  /**
   * Create a new user with hashed password
   */
  static async create(data: CreateUserInput): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user with relations
   */
  static async findByIdWithRelations(id: string): Promise<UserWithRelations | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        ownedProjects: true,
        projectMembers: {
          include: {
            project: true,
          },
        },
        createdTasks: true,
        assignedTasks: true,
        notifications: {
          where: { isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Find multiple users with filters
   */
  static async findMany(filters: UserFilters = {}): Promise<User[]> {
    const where: Prisma.UserWhereInput = {};

    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    return prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update user
   */
  static async update(id: string, data: UpdateUserInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Verify password
   */
  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  /**
   * Update password
   */
  static async updatePassword(id: string, newPassword: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Get user count
   */
  static async count(filters: UserFilters = {}): Promise<number> {
    const where: Prisma.UserWhereInput = {};

    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    return prisma.user.count({ where });
  }
}