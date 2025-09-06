import { PrismaClient, Notification, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { CacheService } from './CacheService';
import { WebSocketService } from './WebSocketService';
import { EmailService } from './EmailService';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationWithUser extends Notification {
  user?: {
    id: string;
    name: string;
    email: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
}

export interface NotificationFilters {
  userId: string;
  type?: NotificationType | NotificationType[];
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export class NotificationService {
  private prisma: PrismaClient;
  private cacheService: CacheService;
  private wsService: WebSocketService;
  private emailService: EmailService;

  constructor() {
    this.prisma = prisma;
    this.cacheService = new CacheService();
    this.wsService = WebSocketService.getInstance();
    this.emailService = new EmailService();
  }

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationDto): Promise<Notification> {
    // Get user preferences
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailNotifications: true,
        pushNotifications: true,
        taskAssignments: true,
        projectUpdates: true,
        mentions: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user wants this type of notification
    const shouldNotify = this.shouldSendNotification(data.type as NotificationType, user);
    if (!shouldNotify) {
      return null as any; // User has disabled this notification type
    }

    // Create the notification
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as NotificationType,
        title: data.title,
        message: data.message,
        data: data.data || {},
      },
    });

    // Send real-time notification via WebSocket
    if (user.pushNotifications) {
      await this.wsService.sendToUser(data.userId, 'notification:new', {
        notification,
      });
    }

    // Send email notification for important types
    if (user.emailNotifications && this.isImportantNotification(data.type as NotificationType)) {
      await this.sendEmailNotification(user, notification);
    }

    // Update unread count in cache
    await this.updateUnreadCount(data.userId, 1);

    return notification;
  }

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(userIds: string[], data: Omit<CreateNotificationDto, 'userId'>): Promise<void> {
    // Get user preferences for all users
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailNotifications: true,
        pushNotifications: true,
        taskAssignments: true,
        projectUpdates: true,
        mentions: true,
      },
    });

    const notifications: Prisma.NotificationCreateManyInput[] = [];
    const emailNotifications: Array<{ user: any; notification: any }> = [];

    for (const user of users) {
      if (this.shouldSendNotification(data.type as NotificationType, user)) {
        const notificationData = {
          userId: user.id,
          type: data.type as NotificationType,
          title: data.title,
          message: data.message,
          data: data.data || {},
        };

        notifications.push(notificationData);

        if (user.emailNotifications && this.isImportantNotification(data.type as NotificationType)) {
          emailNotifications.push({ user, notification: notificationData });
        }
      }
    }

    if (notifications.length === 0) return;

    // Create all notifications
    await this.prisma.notification.createMany({
      data: notifications,
    });

    // Send real-time notifications
    for (const notification of notifications) {
      const user = users.find(u => u.id === notification.userId);
      if (user?.pushNotifications) {
        await this.wsService.sendToUser(notification.userId, 'notification:new', {
          notification,
        });
      }
    }

    // Send email notifications
    for (const { user, notification } of emailNotifications) {
      await this.sendEmailNotification(user, notification);
    }

    // Update unread counts
    for (const userId of userIds) {
      await this.updateUnreadCount(userId, 1);
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(filters: NotificationFilters, pagination?: {
    limit?: number;
    offset?: number;
  }): Promise<{ notifications: Notification[]; total: number; unread: number }> {
    const { limit = 20, offset = 0 } = pagination || {};

    const where: Prisma.NotificationWhereInput = {
      userId: filters.userId,
    };

    if (filters.type) {
      if (Array.isArray(filters.type)) {
        where.type = { in: filters.type };
      } else {
        where.type = filters.type;
      }
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
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

    const [notifications, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          userId: filters.userId,
          isRead: false,
        },
      }),
    ]);

    return { notifications, total, unread };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.isRead) {
      return notification;
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    // Update unread count
    await this.updateUnreadCount(userId, -1);

    // Notify via WebSocket
    await this.wsService.sendToUser(userId, 'notification:read', {
      notificationId,
    });

    return updated;
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    if (result.count > 0) {
      // Update unread count
      await this.updateUnreadCount(userId, -result.count);

      // Notify via WebSocket
      await this.wsService.sendToUser(userId, 'notifications:bulk_read', {
        notificationIds,
        count: result.count,
      });
    }

    return result.count;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    if (result.count > 0) {
      // Clear unread count
      await this.cacheService.delete(`notifications:unread:${userId}`);

      // Notify via WebSocket
      await this.wsService.sendToUser(userId, 'notifications:all_read', {
        count: result.count,
      });
    }

    return result.count;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    if (!notification.isRead) {
      await this.updateUnreadCount(userId, -1);
    }

    // Notify via WebSocket
    await this.wsService.sendToUser(userId, 'notification:deleted', {
      notificationId,
    });
  }

  /**
   * Delete old notifications
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true, // Only delete read notifications
      },
    });

    return result.count;
  }

  /**
   * Get notification preferences for a user
   */
  async getUserPreferences(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailNotifications: true,
        pushNotifications: true,
        taskAssignments: true,
        projectUpdates: true,
        mentions: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update notification preferences
   */
  async updateUserPreferences(userId: string, preferences: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    taskAssignments?: boolean;
    projectUpdates?: boolean;
    mentions?: boolean;
  }): Promise<any> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: preferences,
      select: {
        emailNotifications: true,
        pushNotifications: true,
        taskAssignments: true,
        projectUpdates: true,
        mentions: true,
      },
    });

    // Clear preference cache
    await this.cacheService.delete(`user:preferences:${userId}`);

    return updated;
  }

  /**
   * Get notification statistics for a user
   */
  async getUserNotificationStats(userId: string): Promise<any> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, unread, todayCount, weekCount, byType] = await Promise.all([
      this.prisma.notification.count({
        where: { userId },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          createdAt: { gte: today },
        },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          createdAt: { gte: weekAgo },
        },
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: {
          id: true,
        },
      }),
    ]);

    const typeStats = byType.reduce((acc, item) => {
      acc[item.type] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      unread,
      todayCount,
      weekCount,
      averagePerDay: weekCount / 7,
      byType: typeStats,
    };
  }

  /**
   * Send test notification (for debugging)
   */
  async sendTestNotification(userId: string): Promise<Notification> {
    return this.createNotification({
      userId,
      type: 'PROJECT_UPDATE',
      title: 'Test Notification',
      message: 'This is a test notification to verify the notification system is working correctly.',
      data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Private helper methods

  private shouldSendNotification(type: NotificationType, user: any): boolean {
    switch (type) {
      case 'TASK_ASSIGNED':
        return user.taskAssignments;
      case 'TASK_DUE':
        return user.taskAssignments;
      case 'MENTION':
        return user.mentions;
      case 'PROJECT_UPDATE':
        return user.projectUpdates;
      default:
        return true;
    }
  }

  private isImportantNotification(type: NotificationType): boolean {
    return ['TASK_ASSIGNED', 'TASK_DUE', 'MENTION'].includes(type);
  }

  private async updateUnreadCount(userId: string, delta: number): Promise<void> {
    const cacheKey = `notifications:unread:${userId}`;
    const current = await this.cacheService.get<number>(cacheKey) || 0;
    const newCount = Math.max(0, current + delta);
    
    if (newCount === 0) {
      await this.cacheService.delete(cacheKey);
    } else {
      await this.cacheService.set(cacheKey, newCount, 3600); // Cache for 1 hour
    }
  }

  private async sendEmailNotification(user: any, notification: any): Promise<void> {
    try {
      const subject = `SynergySphere: ${notification.title}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">SynergySphere</h1>
          </div>
          <div style="padding: 20px; background-color: #f5f5f5;">
            <h2 style="color: #333;">${notification.title}</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              ${notification.message}
            </p>
            ${notification.data?.projectId ? `
              <div style="margin-top: 20px;">
                <a href="${process.env.FRONTEND_URL}/projects/${notification.data.projectId}" 
                   style="display: inline-block; padding: 10px 20px; background-color: #1976d2; 
                          color: white; text-decoration: none; border-radius: 5px;">
                  View in SynergySphere
                </a>
              </div>
            ` : ''}
          </div>
          <div style="padding: 10px; text-align: center; color: #999; font-size: 12px;">
            <p>You received this email because you have email notifications enabled.</p>
            <p>
              <a href="${process.env.FRONTEND_URL}/settings/notifications" 
                 style="color: #1976d2;">
                Manage notification preferences
              </a>
            </p>
          </div>
        </div>
      `;

      await this.emailService.sendEmail({
        to: user.email,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
      // Don't throw - email failure shouldn't break notification creation
    }
  }

  /**
   * Schedule notifications for tasks due soon
   */
  async scheduleTaskDueNotifications(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // Find tasks due tomorrow
    const tasksDueTomorrow = await this.prisma.task.findMany({
      where: {
        dueDate: {
          gte: tomorrow,
          lte: tomorrowEnd,
        },
        status: {
          not: 'DONE',
        },
        assigneeId: {
          not: null,
        },
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
    });

    // Create notifications for each task
    for (const task of tasksDueTomorrow) {
      if (task.assigneeId) {
        await this.createNotification({
          userId: task.assigneeId,
          type: 'TASK_DUE',
          title: 'Task Due Tomorrow',
          message: `"${task.title}" in ${task.project.name} is due tomorrow`,
          data: {
            taskId: task.id,
            projectId: task.projectId,
            dueDate: task.dueDate,
          },
        });
      }
    }
  }
}

export default NotificationService;
