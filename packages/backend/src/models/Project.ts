import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import {
  Project,
  ProjectMember,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilters,
  ProjectMemberRole
} from '../types/models';

export class ProjectModel {
  /**
   * Create a new project
   */
  static async create(data: CreateProjectInput): Promise<Project> {
    return prisma.$transaction(async (tx) => {
      // Create the project
      const project = await tx.project.create({
        data,
      });

      // Add the owner as a project member with OWNER role
      await tx.projectMember.create({
        data: {
          userId: data.ownerId,
          projectId: project.id,
          role: ProjectMemberRole.OWNER,
        },
      });

      return project;
    });
  }

  /**
   * Find project by ID
   */
  static async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { id },
    });
  }

  /**
   * Find project with relations
   */
  static async findByIdWithRelations(id: string): Promise<any> {
    return prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  /**
   * Find projects for a user
   */
  static async findByUserId(userId: string, filters: ProjectFilters = {}): Promise<any[]> {
    const where: Prisma.ProjectWhereInput = {
      members: {
        some: {
          userId,
        },
      },
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }

    return prisma.project.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Update project
   */
  static async update(id: string, data: UpdateProjectInput): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete project
   */
  static async delete(id: string): Promise<Project> {
    return prisma.project.delete({
      where: { id },
    });
  }

  /**
   * Add member to project
   */
  static async addMember(
    projectId: string,
    userId: string,
    role: ProjectMemberRole = ProjectMemberRole.MEMBER
  ): Promise<ProjectMember> {
    return prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role,
      },
    });
  }

  /**
   * Remove member from project
   */
  static async removeMember(projectId: string, userId: string): Promise<ProjectMember> {
    return prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    projectId: string,
    userId: string,
    role: ProjectMemberRole
  ): Promise<ProjectMember> {
    return prisma.projectMember.update({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      data: { role },
    });
  }

  /**
   * Check if user is member of project
   */
  static async isMember(projectId: string, userId: string): Promise<boolean> {
    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });
    return !!member;
  }

  /**
   * Get user's role in project
   */
  static async getUserRole(projectId: string, userId: string): Promise<ProjectMemberRole | null> {
    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      select: { role: true },
    });
    return member?.role || null;
  }

  /**
   * Get project statistics
   */
  static async getStatistics(projectId: string) {
    const [taskStats, memberCount, messageCount] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId },
        _count: { status: true },
      }),
      prisma.projectMember.count({
        where: { projectId },
      }),
      prisma.message.count({
        where: { projectId },
      }),
    ]);

    const taskCounts = taskStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);

    return {
      tasks: {
        total: Object.values(taskCounts).reduce((sum, count) => sum + count, 0),
        todo: taskCounts['TODO'] || 0,
        inProgress: taskCounts['IN_PROGRESS'] || 0,
        done: taskCounts['DONE'] || 0,
      },
      members: memberCount,
      messages: messageCount,
    };
  }
}