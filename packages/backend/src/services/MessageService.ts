import { PrismaClient, Message, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotificationService } from './NotificationService';
import { CacheService } from './CacheService';
import { WebSocketService } from './WebSocketService';

export interface CreateMessageDto {
  content: string;
  projectId: string;
  authorId: string;
  parentId?: string;
  mentions?: string[];
}

export interface UpdateMessageDto {
  content: string;
}

export interface MessageWithRelations extends Message {
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  parent?: MessageWithRelations | null;
  replies?: MessageWithRelations[];
  _count?: {
    replies: number;
  };
}

export interface MessageFilters {
  projectId: string;
  parentId?: string | null;
  authorId?: string;
  search?: string;
  hasReplies?: boolean;
  mentions?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class MessageService {
  private prisma: PrismaClient;
  private notificationService: NotificationService;
  private cacheService: CacheService;
  private wsService: WebSocketService;

  constructor() {
    this.prisma = prisma;
    this.notificationService = new NotificationService();
    this.cacheService = new CacheService();
    this.wsService = WebSocketService.getInstance();
  }

  /**
   * Create a new message or reply
   */
  async createMessage(data: CreateMessageDto, userId: string): Promise<MessageWithRelations> {
    // Verify user has access to the project
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId: data.projectId,
        userId: userId,
      },
    });

    if (!member) {
      throw new Error('You are not a member of this project');
    }

    // Validate parent message if it's a reply
    if (data.parentId) {
      const parentMessage = await this.prisma.message.findFirst({
        where: {
          id: data.parentId,
          projectId: data.projectId,
        },
      });

      if (!parentMessage) {
        throw new Error('Parent message not found or belongs to different project');
      }
    }

    // Extract mentions from content
    const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions = data.mentions || [];
    let match;
    while ((match = mentionPattern.exec(data.content)) !== null) {
      const userId = match[2];
      if (!mentions.includes(userId)) {
        mentions.push(userId);
      }
    }

    // Create the message
    const message = await this.prisma.message.create({
      data: {
        content: data.content,
        projectId: data.projectId,
        authorId: data.authorId,
        parentId: data.parentId,
        mentions: mentions,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        parent: data.parentId ? {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        } : undefined,
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    // Send notifications for mentions
    for (const mentionedUserId of mentions) {
      if (mentionedUserId !== data.authorId) {
        await this.notificationService.createNotification({
          userId: mentionedUserId,
          type: 'MENTION',
          title: 'You were mentioned',
          message: `${message.author.name} mentioned you in ${data.parentId ? 'a reply' : 'a message'}`,
          data: {
            messageId: message.id,
            projectId: data.projectId,
            authorId: data.authorId,
          },
        });
      }
    }

    // Notify parent message author about reply
    if (data.parentId && message.parent) {
      const parentAuthorId = (message.parent as any).authorId;
      if (parentAuthorId !== data.authorId) {
        await this.notificationService.createNotification({
          userId: parentAuthorId,
          type: 'PROJECT_UPDATE',
          title: 'New reply to your message',
          message: `${message.author.name} replied to your message`,
          data: {
            messageId: message.id,
            parentId: data.parentId,
            projectId: data.projectId,
            authorId: data.authorId,
          },
        });
      }
    }

    // Broadcast message via WebSocket
    await this.wsService.broadcastToProject(data.projectId, 'message:created', {
      message,
      isReply: !!data.parentId,
    });

    // Invalidate caches
    await this.cacheService.invalidatePattern(`messages:project:${data.projectId}:*`);
    if (data.parentId) {
      await this.cacheService.invalidatePattern(`message:${data.parentId}:replies:*`);
    }

    return message as MessageWithRelations;
  }

  /**
   * Get messages for a project with filtering
   */
  async getProjectMessages(userId: string, filters: MessageFilters, pagination?: {
    limit?: number;
    offset?: number;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ messages: MessageWithRelations[]; total: number }> {
    const { limit = 50, offset = 0, sortOrder = 'desc' } = pagination || {};

    // Verify user has access to the project
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId: filters.projectId,
        userId: userId,
      },
    });

    if (!member) {
      throw new Error('You are not a member of this project');
    }

    // Build where clause
    const where: Prisma.MessageWhereInput = {
      projectId: filters.projectId,
    };

    // Filter by parent (null for root messages, specific ID for replies)
    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.authorId) {
      where.authorId = filters.authorId;
    }

    if (filters.search) {
      where.content = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.hasReplies) {
      where.replies = {
        some: {},
      };
    }

    if (filters.mentions) {
      where.mentions = {
        has: filters.mentions,
      };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    // Execute query
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          parent: filters.parentId ? {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          } : undefined,
          replies: filters.parentId === null ? {
            take: 3, // Load first 3 replies for root messages
            orderBy: { createdAt: 'desc' },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          } : undefined,
          _count: {
            select: {
              replies: true,
            },
          },
        },
        orderBy: { createdAt: sortOrder },
        take: limit,
        skip: offset,
      }),
      this.prisma.message.count({ where }),
    ]);

    return { messages: messages as MessageWithRelations[], total };
  }

  /**
   * Get a single message with its thread
   */
  async getMessageThread(messageId: string, userId: string): Promise<MessageWithRelations | null> {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        project: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        parent: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                  },
                },
                _count: {
                  select: {
                    replies: true,
                  },
                },
              },
            },
            _count: {
              select: {
                replies: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return message as MessageWithRelations;
  }

  /**
   * Update a message
   */
  async updateMessage(messageId: string, userId: string, data: UpdateMessageDto): Promise<MessageWithRelations> {
    // Verify ownership
    const existingMessage = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        authorId: userId,
      },
      include: {
        project: true,
      },
    });

    if (!existingMessage) {
      throw new Error('Message not found or you are not the author');
    }

    // Don't allow editing after 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (existingMessage.createdAt < fifteenMinutesAgo) {
      throw new Error('Cannot edit message after 15 minutes');
    }

    // Extract new mentions
    const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const newMentions: string[] = [];
    let match;
    while ((match = mentionPattern.exec(data.content)) !== null) {
      const userId = match[2];
      if (!newMentions.includes(userId)) {
        newMentions.push(userId);
      }
    }

    // Find newly added mentions
    const previousMentions = existingMessage.mentions;
    const addedMentions = newMentions.filter(m => !previousMentions.includes(m));

    // Update the message
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: data.content,
        mentions: newMentions,
        editedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        parent: existingMessage.parentId ? {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        } : undefined,
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    // Send notifications for new mentions
    for (const mentionedUserId of addedMentions) {
      if (mentionedUserId !== userId) {
        await this.notificationService.createNotification({
          userId: mentionedUserId,
          type: 'MENTION',
          title: 'You were mentioned',
          message: `${updatedMessage.author.name} mentioned you in an edited message`,
          data: {
            messageId: updatedMessage.id,
            projectId: updatedMessage.projectId,
            authorId: userId,
          },
        });
      }
    }

    // Broadcast update via WebSocket
    await this.wsService.broadcastToProject(updatedMessage.projectId, 'message:updated', {
      message: updatedMessage,
    });

    // Invalidate caches
    await this.cacheService.invalidatePattern(`message:${messageId}:*`);
    await this.cacheService.invalidatePattern(`messages:project:${updatedMessage.projectId}:*`);

    return updatedMessage as MessageWithRelations;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    // Verify ownership or admin status
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { authorId: userId },
          {
            project: {
              members: {
                some: {
                  userId: userId,
                  role: { in: ['OWNER', 'ADMIN'] },
                },
              },
            },
          },
        ],
      },
      include: {
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found or insufficient permissions');
    }

    // Don't delete if it has replies
    if (message._count.replies > 0) {
      throw new Error('Cannot delete message with replies');
    }

    // Delete the message
    await this.prisma.message.delete({
      where: { id: messageId },
    });

    // Broadcast deletion
    await this.wsService.broadcastToProject(message.projectId, 'message:deleted', {
      messageId,
      deletedBy: userId,
    });

    // Invalidate caches
    await this.cacheService.invalidatePattern(`message:${messageId}:*`);
    await this.cacheService.invalidatePattern(`messages:project:${message.projectId}:*`);
    if (message.parentId) {
      await this.cacheService.invalidatePattern(`message:${message.parentId}:replies:*`);
    }
  }

  /**
   * Get messages where user is mentioned
   */
  async getUserMentions(userId: string, options?: {
    projectId?: string;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ messages: MessageWithRelations[]; total: number }> {
    const { projectId, limit = 20, offset = 0 } = options || {};

    const where: Prisma.MessageWhereInput = {
      mentions: {
        has: userId,
      },
      project: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.message.count({ where }),
    ]);

    return { messages: messages as MessageWithRelations[], total };
  }

  /**
   * Search messages across projects
   */
  async searchMessages(userId: string, query: string, options?: {
    projectIds?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ messages: MessageWithRelations[]; total: number }> {
    const { projectIds, limit = 20, offset = 0 } = options || {};

    const where: Prisma.MessageWhereInput = {
      content: {
        contains: query,
        mode: 'insensitive',
      },
      project: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    };

    if (projectIds && projectIds.length > 0) {
      where.projectId = { in: projectIds };
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          parent: {
            select: {
              id: true,
              content: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.message.count({ where }),
    ]);

    return { messages: messages as MessageWithRelations[], total };
  }

  /**
   * Get message statistics for a project
   */
  async getProjectMessageStats(projectId: string, userId: string): Promise<any> {
    // Verify user has access
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
      },
    });

    if (!member) {
      throw new Error('You are not a member of this project');
    }

    const [totalMessages, activeThreads, topContributors, recentActivity] = await Promise.all([
      // Total messages
      this.prisma.message.count({
        where: { projectId },
      }),

      // Active threads (messages with replies)
      this.prisma.message.count({
        where: {
          projectId,
          parentId: null,
          replies: {
            some: {},
          },
        },
      }),

      // Top contributors
      this.prisma.message.groupBy({
        by: ['authorId'],
        where: { projectId },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 5,
      }),

      // Recent activity (messages in last 7 days)
      this.prisma.message.count({
        where: {
          projectId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get user details for top contributors
    const contributorIds = topContributors.map(c => c.authorId);
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: contributorIds },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    const contributorsWithDetails = topContributors.map(c => ({
      user: userMap.get(c.authorId),
      messageCount: c._count.id,
    }));

    return {
      totalMessages,
      activeThreads,
      recentActivity,
      topContributors: contributorsWithDetails,
      averageMessagesPerDay: recentActivity / 7,
    };
  }
}

export default MessageService;
