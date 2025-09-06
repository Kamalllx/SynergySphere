import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import {
  Message,
  CreateMessageInput,
  UpdateMessageInput,
  MessageFilters
} from '../types/models';

export class MessageModel {
  /**
   * Create a new message
   */
  static async create(data: CreateMessageInput): Promise<Message> {
    return prisma.message.create({
      data,
    });
  }

  /**
   * Find message by ID
   */
  static async findById(id: string): Promise<Message | null> {
    return prisma.message.findUnique({
      where: { id },
    });
  }

  /**
   * Find message with author and replies
   */
  static async findByIdWithRelations(id: string): Promise<any> {
    return prisma.message.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        parent: {
          include: {
            author: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find messages with filters
   */
  static async findMany(
    filters: MessageFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<any[]> {
    const where: Prisma.MessageWhereInput = {};

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.authorId) {
      where.authorId = filters.authorId;
    }

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    const skip = (page - 1) * limit;

    return prisma.message.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 5, // Limit replies in list view
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
  }

  /**
   * Find project messages (top-level only)
   */
  static async findProjectMessages(
    projectId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<any[]> {
    return this.findMany(
      { projectId, parentId: null },
      page,
      limit
    );
  }

  /**
   * Find message replies
   */
  static async findReplies(parentId: string): Promise<any[]> {
    return prisma.message.findMany({
      where: { parentId },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update message
   */
  static async update(id: string, data: UpdateMessageInput): Promise<Message> {
    return prisma.message.update({
      where: { id },
      data: {
        ...data,
      },
    });
  }

  /**
   * Delete message
   */
  static async delete(id: string): Promise<Message> {
    return prisma.message.delete({
      where: { id },
    });
  }

  /**
   * Search messages in project
   */
  static async search(
    projectId: string,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any[]> {
    const skip = (page - 1) * limit;

    return prisma.message.findMany({
      where: {
        projectId,
        body: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
        parent: {
          select: {
            id: true,
            body: true,
            author: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
  }


  /**
   * Get message count for project
   */
  static async getProjectMessageCount(projectId: string): Promise<number> {
    return prisma.message.count({
      where: { projectId },
    });
  }

  /**
   * Get recent messages for project
   */
  static async getRecentMessages(
    projectId: string,
    limit: number = 10
  ): Promise<any[]> {
    return prisma.message.findMany({
      where: { projectId },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }


  /**
   * Get message statistics for project
   */
  static async getProjectStatistics(projectId: string) {
    const [totalMessages, uniqueAuthors, recentActivity] = await Promise.all([
      prisma.message.count({
        where: { projectId },
      }),
      prisma.message.findMany({
        where: { projectId },
        select: { authorId: true },
        distinct: ['authorId'],
      }),
      prisma.message.count({
        where: {
          projectId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    return {
      total: totalMessages,
      uniqueAuthors: uniqueAuthors.length,
      recentActivity,
    };
  }
}