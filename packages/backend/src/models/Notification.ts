import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import {
  Notification,
  CreateNotificationInput,
  NotificationFilters,
  NotificationType
} from '../types/models';

export class NotificationModel {
  /**
   * Create a new notification
   */
  static async create(data: CreateNotificationInput): Promise<Notification> {
    return prisma.notification.create({
      data,
    });
  }

  /**
   * Create multiple notifications
   */
  static async createMany(notifications: CreateNotificationInput[]): Promise<{ count: number }> {
    return prisma.notification.createMany({
      data: notifications,
    });
  }

  /**
   * Find notification by ID
   */
  static async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({
      where: { id },
    });
  }

  /**
   * Find notifications with filters
   */
  static async findMany(
    filters: NotificationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<Notification[]> {
    const where: Prisma.NotificationWhereInput = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    const skip = (page - 1) * limit;

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
  }

  /**
   * Find user notifications
   */
  static async findUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<Notification[]> {
    return this.findMany({ userId }, page, limit);
  }

  /**
   * Find unread notifications for user
   */
  static async findUnreadNotifications(userId: string): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark multiple notifications as read
   */
  static async markManyAsRead(ids: string[]): Promise<{ count: number }> {
    return prisma.notification.updateMany({
      where: {
        id: { in: ids },
      },
      data: { isRead: true },
    });
  }

  /**
   * Mark all user notifications as read
   */
  static async markAllAsRead(userId: string): Promise<{ count: number }> {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  /**
   * Delete notification
   */
  static async delete(id: string): Promise<Notification> {
    return prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Delete multiple notifications
   */
  static async deleteMany(ids: string[]): Promise<{ count: number }> {
    return prisma.notification.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }

  /**
   * Delete old notifications (older than specified days)
   */
  static async deleteOldNotifications(days: number = 30): Promise<{ count: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });
  }

  /**
   * Get unread notification count for user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Get notification statistics for user
   */
  static async getUserStatistics(userId: string) {
    const [total, unread, byType] = await Promise.all([
      prisma.notification.count({
        where: { userId },
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
      prisma.notification.groupBy({
        by: ['entityType'],
        where: { userId },
        _count: { entityType: true },
      }),
    ]);

    const typeCounts = byType.reduce((acc, stat) => {
      if (stat.entityType) {
        acc[stat.entityType] = stat._count.entityType;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      unread,
      byType: typeCounts,
    };
  }

  /**
   * Create task assignment notification
   */
  static async createTaskAssignmentNotification(
    userId: string,
    taskTitle: string,
    projectName: string,
    taskId: string,
    projectId: string
  ): Promise<Notification> {
    return this.create({
      userId,
      entityType: NotificationType.TASK_ASSIGNED,
      entityId: taskId,
      projectId,
      payload: {
        taskId,
        projectId,
        taskTitle,
        projectName,
        title: 'New Task Assignment',
        message: `You have been assigned to task "${taskTitle}" in project "${projectName}"`,
      },
    });
  }

  /**
   * Create task due notification
   */
  static async createTaskDueNotification(
    userId: string,
    taskTitle: string,
    projectName: string,
    dueDate: Date,
    taskId: string,
    projectId: string
  ): Promise<Notification> {
    const isOverdue = dueDate < new Date();
    const title = isOverdue ? 'Task Overdue' : 'Task Due Soon';
    const message = isOverdue
      ? `Task "${taskTitle}" in project "${projectName}" is overdue`
      : `Task "${taskTitle}" in project "${projectName}" is due soon`;

    return this.create({
      userId,
      entityType: NotificationType.TASK_DUE,
      entityId: taskId,
      projectId,
      payload: {
        taskId,
        projectId,
        taskTitle,
        projectName,
        dueDate: dueDate.toISOString(),
        isOverdue,
        title,
        message,
      },
    });
  }

  /**
   * Create mention notification
   */
  static async createMentionNotification(
    userId: string,
    mentionedBy: string,
    mentionedByName: string,
    projectName: string,
    messageId: string,
    projectId: string
  ): Promise<Notification> {
    return this.create({
      userId,
      entityType: NotificationType.MENTION,
      entityId: messageId,
      projectId,
      payload: {
        messageId,
        projectId,
        projectName,
        mentionedBy,
        mentionedByName,
        title: 'You were mentioned',
        message: `${mentionedByName} mentioned you in project "${projectName}"`,
      },
    });
  }

  /**
   * Create project update notification
   */
  static async createProjectUpdateNotification(
    userId: string,
    projectName: string,
    updateType: string,
    updateMessage: string,
    projectId: string
  ): Promise<Notification> {
    return this.create({
      userId,
      entityType: NotificationType.PROJECT_UPDATE,
      projectId,
      payload: {
        projectId,
        projectName,
        updateType,
        title: 'Project Update',
        message: `${updateMessage} in project "${projectName}"`,
      },
    });
  }

  /**
   * Notify project members
   */
  static async notifyProjectMembers(
    projectId: string,
    excludeUserId: string | null,
    notificationData: Omit<CreateNotificationInput, 'userId'>
  ): Promise<{ count: number }> {
    // Get all project members
    const members = await prisma.projectMember.findMany({
      where: {
        projectId,
        ...(excludeUserId && { userId: { not: excludeUserId } }),
      },
      select: { userId: true },
    });

    if (members.length === 0) {
      return { count: 0 };
    }

    // Create notifications for all members
    const notifications = members.map(member => ({
      ...notificationData,
      userId: member.userId,
    }));

    return this.createMany(notifications);
  }
}