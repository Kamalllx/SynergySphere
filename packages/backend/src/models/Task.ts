import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskStatus
} from '../types/models';

export class TaskModel {
  /**
   * Create a new task
   */
  static async create(data: CreateTaskInput): Promise<Task> {
    return prisma.task.create({
      data,
    });
  }

  /**
   * Find task by ID
   */
  static async findById(id: string): Promise<Task | null> {
    return prisma.task.findUnique({
      where: { id },
    });
  }

  /**
   * Find task with relations
   */
  static async findByIdWithRelations(id: string): Promise<any> {
    return prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Find tasks with filters
   */
  static async findMany(filters: TaskFilters = {}): Promise<any[]> {
    const where: Prisma.TaskWhereInput = {};

    if (filters.projectId) {
      where.projectId = filters.projectId;
    }


    if (filters.creatorId) {
      where.creatorId = filters.creatorId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.overdue) {
      where.AND = [
        { dueDate: { lt: new Date() } },
        { status: { not: TaskStatus.DONE } },
      ];
    }

    return prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Update task
   */
  static async update(id: string, data: UpdateTaskInput): Promise<Task> {
    const updateData: Prisma.TaskUpdateInput = { ...data };


    return prisma.task.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Update task status
   */
  static async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.update(id, { status });
  }

  /**
   * Assign task to user
   */
  static async assign(id: string, assigneeId: string): Promise<any> {
    return prisma.taskAssignment.create({
      data: {
        taskId: id,
        userId: assigneeId,
      },
    });
  }

  /**
   * Unassign task
   */
  static async unassign(id: string, assigneeId: string): Promise<any> {
    return prisma.taskAssignment.delete({
      where: {
        taskId_userId: {
          taskId: id,
          userId: assigneeId,
        },
      },
    });
  }

  /**
   * Delete task
   */
  static async delete(id: string): Promise<Task> {
    return prisma.task.delete({
      where: { id },
    });
  }

  /**
   * Get overdue tasks
   */
  static async getOverdueTasks(projectId?: string): Promise<any[]> {
    const where: Prisma.TaskWhereInput = {
      dueDate: { lt: new Date() },
      status: { not: TaskStatus.DONE },
    };

    if (projectId) {
      where.projectId = projectId;
    }

    return prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get tasks due soon (within next 24 hours)
   */
  static async getTasksDueSoon(projectId?: string): Promise<any[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: Prisma.TaskWhereInput = {
      dueDate: {
        gte: new Date(),
        lte: tomorrow,
      },
      status: { not: TaskStatus.DONE },
    };

    if (projectId) {
      where.projectId = projectId;
    }

    return prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get task statistics for a project
   */
  static async getProjectStatistics(projectId: string) {
    const [statusStats, priorityStats, assigneeStats] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId },
        _count: { status: true },
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: { projectId },
        _count: { priority: true },
      }),
      prisma.task.groupBy({
        by: ['projectId'],
        where: { projectId },
        _count: { projectId: true },
      }),
    ]);

    const statusCounts = statusStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);

    const priorityCounts = priorityStats.reduce((acc, stat) => {
      if (stat.priority !== null) {
        acc[stat.priority] = stat._count.priority;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      status: {
        todo: statusCounts['TODO'] || 0,
        inProgress: statusCounts['IN_PROGRESS'] || 0,
        done: statusCounts['DONE'] || 0,
        total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      },
      priority: {
        low: priorityCounts['LOW'] || 0,
        medium: priorityCounts['MEDIUM'] || 0,
        high: priorityCounts['HIGH'] || 0,
      },
      assignees: assigneeStats.length,
    };
  }

  /**
   * Get user's task statistics
   */
  static async getUserStatistics(userId: string) {
    const [assignedStats, createdStats] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: {
          assignments: {
            some: {
              userId,
            },
          },
        },
        _count: { status: true },
      }),
      prisma.task.count({
        where: { creatorId: userId },
      }),
    ]);

    const statusCounts = assignedStats.reduce((acc, stat) => {
      if (stat._count && stat._count.status) {
        acc[stat.status] = stat._count.status;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      assigned: {
        todo: statusCounts['TODO'] || 0,
        inProgress: statusCounts['IN_PROGRESS'] || 0,
        done: statusCounts['DONE'] || 0,
        total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      },
      created: createdStats,
    };
  }
}