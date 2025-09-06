import { PrismaClient, Task, TaskStatus, TaskPriority, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotificationService } from './NotificationService';
import { CacheService } from './CacheService';
import { WebSocketService } from './WebSocketService';

export interface CreateTaskDto {
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  creatorId: string;
  dueDate?: Date;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  assigneeId?: string | null;
  dueDate?: Date | null;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export interface TaskFilters {
  projectId?: string;
  assigneeId?: string | null;
  creatorId?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
  overdue?: boolean;
}

export interface TaskWithRelations extends Task {
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  creator: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  project: {
    id: string;
    name: string;
  };
}

export class TaskService {
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
   * Create a new task
   */
  async createTask(data: CreateTaskDto, userId: string): Promise<TaskWithRelations> {
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

    // Create the task
    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        creatorId: data.creatorId,
        dueDate: data.dueDate,
        priority: data.priority || TaskPriority.MEDIUM,
        status: data.status || TaskStatus.TODO,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        creator: {
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
      },
    });

    // Send notification to assignee if different from creator
    if (task.assigneeId && task.assigneeId !== task.creatorId) {
      await this.notificationService.createNotification({
        userId: task.assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You have been assigned: ${task.title}`,
        data: { 
          taskId: task.id, 
          projectId: task.projectId,
          assignedBy: task.creatorId 
        },
      });
    }

    // Broadcast task creation via WebSocket
    await this.wsService.broadcastToProject(task.projectId, 'task:created', {
      task,
      createdBy: userId,
    });

    // Invalidate project cache
    await this.cacheService.invalidatePattern(`project:${task.projectId}:*`);
    await this.cacheService.invalidatePattern(`tasks:project:${task.projectId}:*`);

    return task;
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string, userId: string): Promise<TaskWithRelations | null> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        creator: {
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
      },
    });

    return task;
  }

  /**
   * Get tasks with advanced filtering
   */
  async getTasks(userId: string, filters: TaskFilters, pagination?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ tasks: TaskWithRelations[]; total: number }> {
    const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = pagination || {};

    // Build where clause
    const where: Prisma.TaskWhereInput = {
      // User must be a member of the project
      project: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    };

    // Apply filters
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters.assigneeId !== undefined) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters.creatorId) {
      where.creatorId = filters.creatorId;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        where.priority = { in: filters.priority };
      } else {
        where.priority = filters.priority;
      }
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) {
        where.dueDate.gte = filters.dueDateFrom;
      }
      if (filters.dueDateTo) {
        where.dueDate.lte = filters.dueDateTo;
      }
    }

    if (filters.overdue) {
      where.dueDate = {
        lt: new Date(),
      };
      where.status = {
        not: TaskStatus.DONE,
      };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Execute query
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          creator: {
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
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { tasks, total };
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, userId: string, data: UpdateTaskDto): Promise<TaskWithRelations> {
    // Get existing task
    const existingTask = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      },
      include: {
        project: true,
      },
    });

    if (!existingTask) {
      throw new Error('Task not found or you do not have access');
    }

    // Track changes for notifications
    const changes: string[] = [];
    const previousAssignee = existingTask.assigneeId;
    const previousStatus = existingTask.status;

    // Update the task
    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.status !== undefined && { 
          status: data.status,
          ...(data.status === TaskStatus.DONE && { completedAt: new Date() }),
          ...(data.status !== TaskStatus.DONE && { completedAt: null }),
        }),
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        creator: {
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
      },
    });

    // Build change descriptions
    if (data.title && data.title !== existingTask.title) {
      changes.push('title');
    }
    if (data.status && data.status !== previousStatus) {
      changes.push(`status to ${data.status}`);
    }
    if (data.assigneeId !== undefined && data.assigneeId !== previousAssignee) {
      changes.push('assignee');
    }
    if (data.priority && data.priority !== existingTask.priority) {
      changes.push(`priority to ${data.priority}`);
    }
    if (data.dueDate !== undefined && data.dueDate?.getTime() !== existingTask.dueDate?.getTime()) {
      changes.push('due date');
    }

    // Send notifications
    const notifyUsers = new Set<string>();

    // Notify assignee if changed
    if (data.assigneeId !== undefined && data.assigneeId !== previousAssignee) {
      if (data.assigneeId) {
        notifyUsers.add(data.assigneeId);
        await this.notificationService.createNotification({
          userId: data.assigneeId,
          type: 'TASK_ASSIGNED',
          title: 'Task Assigned',
          message: `You have been assigned: ${updatedTask.title}`,
          data: { taskId, projectId: updatedTask.projectId, assignedBy: userId },
        });
      }
      // Notify previous assignee about unassignment
      if (previousAssignee) {
        notifyUsers.add(previousAssignee);
        await this.notificationService.createNotification({
          userId: previousAssignee,
          type: 'PROJECT_UPDATE',
          title: 'Task Unassigned',
          message: `You have been unassigned from: ${updatedTask.title}`,
          data: { taskId, projectId: updatedTask.projectId },
        });
      }
    }

    // Notify creator about significant changes
    if (updatedTask.creatorId !== userId && changes.length > 0) {
      notifyUsers.add(updatedTask.creatorId);
      await this.notificationService.createNotification({
        userId: updatedTask.creatorId,
        type: 'PROJECT_UPDATE',
        title: 'Task Updated',
        message: `Task "${updatedTask.title}" has been updated: ${changes.join(', ')}`,
        data: { taskId, projectId: updatedTask.projectId, updatedBy: userId },
      });
    }

    // Broadcast update via WebSocket
    await this.wsService.broadcastToProject(updatedTask.projectId, 'task:updated', {
      task: updatedTask,
      updatedBy: userId,
      changes,
    });

    // Invalidate caches
    await this.cacheService.invalidatePattern(`task:${taskId}:*`);
    await this.cacheService.invalidatePattern(`tasks:project:${updatedTask.projectId}:*`);

    return updatedTask;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string, userId: string): Promise<void> {
    // Verify permission
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { creatorId: userId },
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
    });

    if (!task) {
      throw new Error('Task not found or insufficient permissions');
    }

    // Delete the task
    await this.prisma.task.delete({
      where: { id: taskId },
    });

    // Broadcast deletion
    await this.wsService.broadcastToProject(task.projectId, 'task:deleted', {
      taskId,
      deletedBy: userId,
    });

    // Invalidate caches
    await this.cacheService.invalidatePattern(`task:${taskId}:*`);
    await this.cacheService.invalidatePattern(`tasks:project:${task.projectId}:*`);
  }

  /**
   * Bulk update task status
   */
  async bulkUpdateStatus(taskIds: string[], status: TaskStatus, userId: string): Promise<number> {
    // Verify permissions for all tasks
    const tasks = await this.prisma.task.findMany({
      where: {
        id: { in: taskIds },
        project: {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      },
      select: {
        id: true,
        projectId: true,
        title: true,
        assigneeId: true,
      },
    });

    if (tasks.length === 0) {
      throw new Error('No tasks found or insufficient permissions');
    }

    // Update tasks
    const result = await this.prisma.task.updateMany({
      where: {
        id: { in: tasks.map(t => t.id) },
      },
      data: {
        status,
        ...(status === TaskStatus.DONE && { completedAt: new Date() }),
        ...(status !== TaskStatus.DONE && { completedAt: null }),
      },
    });

    // Group tasks by project for WebSocket broadcast
    const tasksByProject = tasks.reduce((acc, task) => {
      if (!acc[task.projectId]) {
        acc[task.projectId] = [];
      }
      acc[task.projectId].push(task);
      return acc;
    }, {} as Record<string, typeof tasks>);

    // Broadcast updates per project
    for (const [projectId, projectTasks] of Object.entries(tasksByProject)) {
      await this.wsService.broadcastToProject(projectId, 'tasks:bulk_updated', {
        taskIds: projectTasks.map(t => t.id),
        status,
        updatedBy: userId,
      });
    }

    // Invalidate caches
    for (const projectId of Object.keys(tasksByProject)) {
      await this.cacheService.invalidatePattern(`tasks:project:${projectId}:*`);
    }

    return result.count;
  }

  /**
   * Get task statistics for a project
   */
  async getProjectTaskStats(projectId: string, userId: string): Promise<any> {
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

    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      select: {
        status: true,
        priority: true,
        assigneeId: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
      },
    });

    const now = new Date();
    const stats = {
      total: tasks.length,
      byStatus: {
        [TaskStatus.TODO]: 0,
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.DONE]: 0,
      },
      byPriority: {
        [TaskPriority.LOW]: 0,
        [TaskPriority.MEDIUM]: 0,
        [TaskPriority.HIGH]: 0,
      },
      overdue: 0,
      dueSoon: 0, // Due in next 3 days
      unassigned: 0,
      completedThisWeek: 0,
      averageCompletionTime: 0,
    };

    let totalCompletionTime = 0;
    let completedCount = 0;

    for (const task of tasks) {
      // Status stats
      stats.byStatus[task.status]++;

      // Priority stats
      stats.byPriority[task.priority]++;

      // Unassigned
      if (!task.assigneeId) {
        stats.unassigned++;
      }

      // Overdue
      if (task.dueDate && task.dueDate < now && task.status !== TaskStatus.DONE) {
        stats.overdue++;
      }

      // Due soon (next 3 days)
      if (task.dueDate && task.status !== TaskStatus.DONE) {
        const daysUntilDue = (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntilDue >= 0 && daysUntilDue <= 3) {
          stats.dueSoon++;
        }
      }

      // Completed this week
      if (task.completedAt) {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (task.completedAt >= weekAgo) {
          stats.completedThisWeek++;
        }

        // Calculate completion time
        const completionTime = task.completedAt.getTime() - task.createdAt.getTime();
        totalCompletionTime += completionTime;
        completedCount++;
      }
    }

    // Average completion time in hours
    if (completedCount > 0) {
      stats.averageCompletionTime = Math.round(totalCompletionTime / completedCount / (1000 * 60 * 60));
    }

    return stats;
  }

  /**
   * Get user's tasks across all projects
   */
  async getUserTasks(userId: string, filters?: {
    assignedToMe?: boolean;
    createdByMe?: boolean;
    status?: TaskStatus[];
    dueDateFrom?: Date;
    dueDateTo?: Date;
  }): Promise<TaskWithRelations[]> {
    const where: Prisma.TaskWhereInput = {
      project: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    };

    if (filters?.assignedToMe) {
      where.assigneeId = userId;
    }

    if (filters?.createdByMe) {
      where.creatorId = userId;
    }

    if (filters?.status) {
      where.status = { in: filters.status };
    }

    if (filters?.dueDateFrom || filters?.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) {
        where.dueDate.gte = filters.dueDateFrom;
      }
      if (filters.dueDateTo) {
        where.dueDate.lte = filters.dueDateTo;
      }
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        creator: {
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
      },
      orderBy: [
        { dueDate: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return tasks;
  }
}

export default TaskService;
