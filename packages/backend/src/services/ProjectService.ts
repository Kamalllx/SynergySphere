import { PrismaClient, Project, ProjectMember, ProjectMemberRole, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotificationService } from './NotificationService';
import { CacheService } from './CacheService';

export interface CreateProjectDto {
  name: string;
  description?: string;
  ownerId: string;
  isPublic?: boolean;
  allowMemberInvites?: boolean;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  isPublic?: boolean;
  allowMemberInvites?: boolean;
}

export interface AddMemberDto {
  userId: string;
  role?: ProjectMemberRole;
}

export interface ProjectWithMembers extends Project {
  members: (ProjectMember & {
    user: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    };
  })[];
  _count?: {
    tasks: number;
    messages: number;
  };
}

export class ProjectService {
  private prisma: PrismaClient;
  private notificationService: NotificationService;
  private cacheService: CacheService;

  constructor() {
    this.prisma = prisma;
    this.notificationService = new NotificationService();
    this.cacheService = new CacheService();
  }

  /**
   * Create a new project
   */
  async createProject(data: CreateProjectDto): Promise<ProjectWithMembers> {
    const project = await this.prisma.$transaction(async (tx) => {
      // Create the project
      const newProject = await tx.project.create({
        data: {
          name: data.name,
          description: data.description,
          ownerId: data.ownerId,
          isPublic: data.isPublic ?? false,
          allowMemberInvites: data.allowMemberInvites ?? true,
        },
      });

      // Add owner as a member
      await tx.projectMember.create({
        data: {
          projectId: newProject.id,
          userId: data.ownerId,
          role: ProjectMemberRole.OWNER,
        },
      });

      // Fetch the complete project with members
      const projectWithMembers = await tx.project.findUnique({
        where: { id: newProject.id },
        include: {
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
          },
          _count: {
            select: {
              tasks: true,
              messages: true,
            },
          },
        },
      });

      return projectWithMembers;
    });

    // Invalidate user's project cache
    await this.cacheService.invalidatePattern(`projects:user:${data.ownerId}:*`);

    return project as ProjectWithMembers;
  }

  /**
   * Get project by ID with authorization check
   */
  async getProjectById(projectId: string, userId: string): Promise<ProjectWithMembers | null> {
    // Try to get from cache first
    const cacheKey = `project:${projectId}:user:${userId}`;
    const cached = await this.cacheService.get<ProjectWithMembers>(cacheKey);
    if (cached) return cached;

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { isPublic: true },
          {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      include: {
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
        },
        _count: {
          select: {
            tasks: true,
            messages: true,
          },
        },
      },
    });

    if (project) {
      await this.cacheService.set(cacheKey, project, 300); // Cache for 5 minutes
    }

    return project;
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(userId: string, options?: {
    limit?: number;
    offset?: number;
    search?: string;
    sortBy?: 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ projects: ProjectWithMembers[]; total: number }> {
    const { limit = 20, offset = 0, search, sortBy = 'updatedAt', sortOrder = 'desc' } = options || {};

    const where: Prisma.ProjectWhereInput = {
      members: {
        some: {
          userId: userId,
        },
      },
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
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
          },
          _count: {
            select: {
              tasks: true,
              messages: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { projects, total };
  }

  /**
   * Update project details
   */
  async updateProject(projectId: string, userId: string, data: UpdateProjectDto): Promise<ProjectWithMembers> {
    // Check if user has permission to update
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        role: { in: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN] },
      },
    });

    if (!member) {
      throw new Error('Insufficient permissions to update project');
    }

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.allowMemberInvites !== undefined && { allowMemberInvites: data.allowMemberInvites }),
      },
      include: {
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
        },
        _count: {
          select: {
            tasks: true,
            messages: true,
          },
        },
      },
    });

    // Invalidate caches
    await this.cacheService.invalidatePattern(`project:${projectId}:*`);
    
    // Notify members about project update
    const memberIds = updatedProject.members.map(m => m.userId).filter(id => id !== userId);
    for (const memberId of memberIds) {
      await this.notificationService.createNotification({
        userId: memberId,
        type: 'PROJECT_UPDATE',
        title: 'Project Updated',
        message: `${updatedProject.name} has been updated`,
        data: { projectId, updatedBy: userId },
      });
    }

    return updatedProject;
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    // Check if user is the owner
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        role: ProjectMemberRole.OWNER,
      },
    });

    if (!member) {
      throw new Error('Only project owner can delete the project');
    }

    // Delete project (cascades to related entities)
    await this.prisma.project.delete({
      where: { id: projectId },
    });

    // Invalidate all related caches
    await this.cacheService.invalidatePattern(`project:${projectId}:*`);
    await this.cacheService.invalidatePattern(`projects:user:*`);
  }

  /**
   * Add a member to project
   */
  async addMember(projectId: string, requesterId: string, data: AddMemberDto): Promise<ProjectMember> {
    // Check if requester has permission
    const requester = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: requesterId,
        role: { in: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN] },
      },
    });

    if (!requester) {
      // Check if project allows member invites
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { allowMemberInvites: true },
      });

      if (!project?.allowMemberInvites) {
        throw new Error('Insufficient permissions to add members');
      }
    }

    // Check if user is already a member
    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: data.userId,
          projectId,
        },
      },
    });

    if (existingMember) {
      throw new Error('User is already a member of this project');
    }

    // Add member
    const newMember = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: data.userId,
        role: data.role || ProjectMemberRole.MEMBER,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
    });

    // Invalidate caches
    await this.cacheService.invalidatePattern(`project:${projectId}:*`);
    await this.cacheService.invalidatePattern(`projects:user:${data.userId}:*`);

    // Send notification to new member
    await this.notificationService.createNotification({
      userId: data.userId,
      type: 'PROJECT_UPDATE',
      title: 'Added to Project',
      message: `You have been added to ${newMember.project.name}`,
      data: { projectId, addedBy: requesterId },
    });

    return newMember;
  }

  /**
   * Remove a member from project
   */
  async removeMember(projectId: string, requesterId: string, userIdToRemove: string): Promise<void> {
    // Check if requester has permission
    const requester = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: requesterId,
        role: { in: [ProjectMemberRole.OWNER, ProjectMemberRole.ADMIN] },
      },
    });

    // Users can remove themselves
    if (!requester && requesterId !== userIdToRemove) {
      throw new Error('Insufficient permissions to remove members');
    }

    // Cannot remove project owner
    const memberToRemove = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: userIdToRemove,
      },
    });

    if (memberToRemove?.role === ProjectMemberRole.OWNER) {
      throw new Error('Cannot remove project owner');
    }

    // Remove member
    await this.prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId: userIdToRemove,
          projectId,
        },
      },
    });

    // Reassign tasks if needed
    await this.prisma.task.updateMany({
      where: {
        projectId,
        assigneeId: userIdToRemove,
      },
      data: {
        assigneeId: null,
      },
    });

    // Invalidate caches
    await this.cacheService.invalidatePattern(`project:${projectId}:*`);
    await this.cacheService.invalidatePattern(`projects:user:${userIdToRemove}:*`);
  }

  /**
   * Update member role
   */
  async updateMemberRole(projectId: string, requesterId: string, userId: string, newRole: ProjectMemberRole): Promise<ProjectMember> {
    // Only owner can change roles
    const requester = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: requesterId,
        role: ProjectMemberRole.OWNER,
      },
    });

    if (!requester) {
      throw new Error('Only project owner can change member roles');
    }

    // Cannot change owner's role
    if (userId === requesterId) {
      throw new Error('Cannot change owner role');
    }

    const updatedMember = await this.prisma.projectMember.update({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      data: {
        role: newRole,
      },
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
    });

    // Invalidate caches
    await this.cacheService.invalidatePattern(`project:${projectId}:*`);

    return updatedMember;
  }

  /**
   * Get project statistics
   */
  async getProjectStats(projectId: string): Promise<any> {
    const stats = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        _count: {
          select: {
            tasks: true,
            messages: true,
            members: true,
          },
        },
        tasks: {
          select: {
            status: true,
            priority: true,
          },
        },
      },
    });

    if (!stats) return null;

    const tasksByStatus = stats.tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tasksByPriority = stats.tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTasks: stats._count.tasks,
      totalMessages: stats._count.messages,
      totalMembers: stats._count.members,
      tasksByStatus,
      tasksByPriority,
      completionRate: tasksByStatus.DONE ? (tasksByStatus.DONE / stats._count.tasks) * 100 : 0,
    };
  }
}

export default ProjectService;
