import { 
  User as PrismaUser,
  Project as PrismaProject,
  ProjectMember as PrismaProjectMember,
  Task as PrismaTask,
  Message as PrismaMessage,
  Notification as PrismaNotification
} from '@prisma/client';

// Define enums based on schema comments
export enum ProjectMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  BLOCKED = 'blocked'
}

export enum TaskPriority {
  LOW = 1,
  MEDIUM_LOW = 2,
  MEDIUM = 3,
  MEDIUM_HIGH = 4,
  HIGH = 5
}

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_DUE = 'task_due',
  MENTION = 'mention',
  PROJECT_UPDATE = 'project_update'
}

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
  fullName?: string;
  password: string;
}

export interface UpdateUserInput {
  fullName?: string;
  isActive?: boolean;
  preferences?: Record<string, any>;
}

export interface CreateProjectInput {
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
}

export interface UpdateProjectInput {
  name?: string;
  slug?: string;
  description?: string;
  status?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId: string;
  creatorId: string;
  dueDate?: Date;
  estimateMinutes?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  estimateMinutes?: number;
}

export interface CreateMessageInput {
  body: string;
  projectId: string;
  authorId: string;
  parentId?: string;
  taskId?: string;
}

export interface UpdateMessageInput {
  body?: string;
}

export interface CreateNotificationInput {
  userId: string;
  projectId?: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, any>;
}

// Query filter types
export interface UserFilters {
  email?: string;
  fullName?: string;
}

export interface ProjectFilters {
  ownerId?: string;
  status?: string;
  search?: string;
}

export interface TaskFilters {
  projectId?: string;
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
  entityType?: string;
  isRead?: boolean;
}