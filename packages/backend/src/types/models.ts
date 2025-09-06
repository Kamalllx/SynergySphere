import { 
  User as PrismaUser,
  Project as PrismaProject,
  ProjectMember as PrismaProjectMember,
  Task as PrismaTask,
  Message as PrismaMessage,
  Notification as PrismaNotification,
  ProjectMemberRole,
  TaskStatus,
  TaskPriority,
  NotificationType
} from '@prisma/client';

// Export Prisma enums
export { ProjectMemberRole, TaskStatus, TaskPriority, NotificationType };

// Base model interfaces
export interface User extends PrismaUser {}

export interface Project extends PrismaProject {}

export interface ProjectMember extends PrismaProjectMember {}

export interface Task extends PrismaTask {}

export interface Message extends PrismaMessage {}

export interface Notification extends PrismaNotification {}

// Extended interfaces with relations
export interface UserWithRelations extends User {
  ownedProjects?: Project[];
  projectMembers?: ProjectMemberWithProject[];
  createdTasks?: Task[];
  assignedTasks?: Task[];
  messages?: Message[];
  notifications?: Notification[];
}

export interface ProjectWithRelations extends Project {
  owner?: Partial<User>;
  members?: ProjectMemberWithUser[];
  tasks?: TaskWithRelations[];
  messages?: MessageWithAuthor[];
  _count?: {
    tasks?: number;
    messages?: number;
  };
}

export interface ProjectMemberWithUser extends ProjectMember {
  user: Partial<User>;
}

export interface ProjectMemberWithProject extends ProjectMember {
  project: Project;
}

export interface TaskWithRelations extends Task {
  project?: Partial<Project>;
  assignee?: Partial<User> | null;
  creator?: Partial<User>;
}

export interface MessageWithAuthor extends Message {
  author: Partial<User>;
  replies?: MessageWithAuthor[];
  parent?: MessageWithAuthor | null;
  project?: Partial<Project>;
  _count?: {
    replies?: number;
  };
}

export interface NotificationWithUser extends Notification {
  user: User;
}

// Input types for creating/updating models
export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  avatar?: string;
}

export interface UpdateUserInput {
  name?: string;
  avatar?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  taskAssignments?: boolean;
  projectUpdates?: boolean;
  mentions?: boolean;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  ownerId: string;
  isPublic?: boolean;
  allowMemberInvites?: boolean;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
  allowMemberInvites?: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId: string;
  assigneeId?: string;
  creatorId: string;
  dueDate?: Date;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: Date;
}

export interface CreateMessageInput {
  content: string;
  projectId: string;
  authorId: string;
  parentId?: string;
  mentions?: string[];
}

export interface UpdateMessageInput {
  content?: string;
  mentions?: string[];
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

// Query filter types
export interface UserFilters {
  email?: string;
  name?: string;
}

export interface ProjectFilters {
  ownerId?: string;
  isPublic?: boolean;
  search?: string;
}

export interface TaskFilters {
  projectId?: string;
  assigneeId?: string;
  creatorId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  overdue?: boolean;
}

export interface MessageFilters {
  projectId?: string;
  authorId?: string;
  parentId?: string | null;
}

export interface NotificationFilters {
  userId?: string;
  type?: NotificationType;
  isRead?: boolean;
}