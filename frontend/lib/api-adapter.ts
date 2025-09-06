/**
 * API Adapter Layer
 * This file maps between the frontend's expected data structure and the backend's actual API
 */

import { api, type ApiResponse } from './api';

// ============= TYPE MAPPINGS =============

// Backend types (what the API actually returns)
interface BackendProject {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  allowMemberInvites: boolean;
  createdAt: string;
  updatedAt: string;
  members?: Array<{
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    user: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    };
  }>;
  _count?: {
    tasks: number;
    messages: number;
  };
}

interface BackendTask {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  projectId: string;
  assigneeId?: string;
  creatorId: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  project?: {
    id: string;
    name: string;
  };
}

interface BackendMessage {
  id: string;
  content: string;
  projectId: string;
  authorId: string;
  parentId?: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  _count?: {
    replies: number;
  };
}

interface BackendNotification {
  id: string;
  userId: string;
  type: 'TASK_ASSIGNED' | 'TASK_DUE' | 'MENTION' | 'PROJECT_UPDATE';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

// Frontend types (what the frontend expects)
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  membersCount?: number;
  tasksCount?: number;
  messagesCount?: number;
  owner?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  members?: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'owner' | 'admin' | 'member';
  }>;
}

interface FrontendProject extends Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  membersCount?: number;
  tasksCount?: number;
  messagesCount?: number;
  owner?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  members?: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'owner' | 'admin' | 'member';
  }>;
}

interface FrontendTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  projectId: string;
  assignedTo?: string;
  assignedToUser?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  project?: {
    id: string;
    name: string;
  };
}

// ============= ADAPTER FUNCTIONS =============

/**
 * Convert backend project to frontend format
 */
function adaptProject(backendProject: BackendProject): FrontendProject {
  // Determine project status based on backend data
  let status: FrontendProject['status'] = 'active';
  
  // Find owner from members
  const owner = backendProject.members?.find(m => m.role === 'OWNER');
  
  return {
    id: backendProject.id,
    name: backendProject.name,
    description: backendProject.description,
    status: status,
    priority: 'medium', // Default priority since backend doesn't have this
    startDate: backendProject.createdAt,
    endDate: undefined, // Backend doesn't track this
    createdAt: backendProject.createdAt,
    updatedAt: backendProject.updatedAt,
    membersCount: backendProject.members?.length || 0,
    tasksCount: backendProject._count?.tasks || 0,
    messagesCount: backendProject._count?.messages || 0,
    owner: owner ? {
      id: owner.user.id,
      name: owner.user.name,
      email: owner.user.email,
      avatar: owner.user.avatar || undefined,
    } : undefined,
    members: backendProject.members?.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar || undefined,
      role: m.role.toLowerCase() as 'owner' | 'admin' | 'member',
    })),
  };
}

/**
 * Convert frontend project data to backend format
 */
function adaptProjectInput(frontendData: any): any {
  const backendData: any = {
    name: frontendData.name,
    description: frontendData.description,
  };

  // Only include fields that backend expects
  if (frontendData.isPublic !== undefined) {
    backendData.isPublic = frontendData.isPublic;
  }
  if (frontendData.allowMemberInvites !== undefined) {
    backendData.allowMemberInvites = frontendData.allowMemberInvites;
  }

  return backendData;
}

/**
 * Convert backend task to frontend format
 */
function adaptTask(backendTask: BackendTask): FrontendTask {
  // Map backend status to frontend status
  const statusMap: Record<string, FrontendTask['status']> = {
    'TODO': 'todo',
    'IN_PROGRESS': 'in-progress',
    'DONE': 'done',
  };

  // Map backend priority to frontend priority
  const priorityMap: Record<string, FrontendTask['priority']> = {
    'LOW': 'low',
    'MEDIUM': 'medium',
    'HIGH': 'high',
  };

  return {
    id: backendTask.id,
    title: backendTask.title,
    description: backendTask.description,
    status: statusMap[backendTask.status] || 'todo',
    priority: priorityMap[backendTask.priority] || 'medium',
    projectId: backendTask.projectId,
    assignedTo: backendTask.assigneeId,
    assignedToUser: backendTask.assignee ? {
      id: backendTask.assignee.id,
      name: backendTask.assignee.name,
      email: backendTask.assignee.email,
      avatar: backendTask.assignee.avatar || undefined,
    } : undefined,
    dueDate: backendTask.dueDate,
    createdAt: backendTask.createdAt,
    updatedAt: backendTask.updatedAt,
    completedAt: backendTask.completedAt,
    project: backendTask.project,
  };
}

/**
 * Convert frontend task data to backend format
 */
function adaptTaskInput(frontendData: any): any {
  // Map frontend status to backend status
  const statusMap: Record<string, string> = {
    'todo': 'TODO',
    'in-progress': 'IN_PROGRESS',
    'review': 'IN_PROGRESS', // Backend doesn't have review, map to in-progress
    'done': 'DONE',
  };

  // Map frontend priority to backend priority
  const priorityMap: Record<string, string> = {
    'low': 'LOW',
    'medium': 'MEDIUM',
    'high': 'HIGH',
    'critical': 'HIGH', // Backend doesn't have critical, map to high
  };

  const backendData: any = {
    title: frontendData.title,
    description: frontendData.description,
    projectId: frontendData.projectId,
  };

  if (frontendData.status) {
    backendData.status = statusMap[frontendData.status] || 'TODO';
  }
  if (frontendData.priority) {
    backendData.priority = priorityMap[frontendData.priority] || 'MEDIUM';
  }
  if (frontendData.assignedTo) {
    backendData.assigneeId = frontendData.assignedTo;
  }
  if (frontendData.dueDate) {
    backendData.dueDate = frontendData.dueDate;
  }

  return backendData;
}

// ============= ADAPTED API SERVICES =============

/**
 * Adapted Projects Service
 * Wraps the actual API calls and transforms data between frontend and backend formats
 */
export const adaptedProjectsService = {
  /**
   * Get all projects for the current user
   */
  async getAll(): Promise<ApiResponse<FrontendProject[]>> {
    const response = await api.get<{ data: BackendProject[], pagination: any }>('/api/projects');
    
    if (response.success && response.data) {
      const projects = response.data.data || response.data;
      const adaptedProjects = Array.isArray(projects) 
        ? projects.map(adaptProject)
        : [];
      
      return {
        success: true,
        data: adaptedProjects,
      };
    }
    
    return response as ApiResponse<FrontendProject[]>;
  },

  /**
   * Get project by ID
   */
  async getById(id: string): Promise<ApiResponse<FrontendProject>> {
    const response = await api.get<{ data: BackendProject }>(`/api/projects/${id}`);
    
    if (response.success && response.data) {
      const project = response.data.data || response.data;
      return {
        success: true,
        data: adaptProject(project as BackendProject),
      };
    }
    
    return response as ApiResponse<FrontendProject>;
  },

  /**
   * Create new project
   */
  async create(data: any): Promise<ApiResponse<FrontendProject>> {
    const backendData = adaptProjectInput(data);
    const response = await api.post<{ data: BackendProject }>('/api/projects', backendData);
    
    if (response.success && response.data) {
      const project = response.data.data || response.data;
      return {
        success: true,
        data: adaptProject(project as BackendProject),
      };
    }
    
    return response as ApiResponse<FrontendProject>;
  },

  /**
   * Update project
   */
  async update(id: string, data: any): Promise<ApiResponse<FrontendProject>> {
    const backendData = adaptProjectInput(data);
    const response = await api.put<{ data: BackendProject }>(`/api/projects/${id}`, backendData);
    
    if (response.success && response.data) {
      const project = response.data.data || response.data;
      return {
        success: true,
        data: adaptProject(project as BackendProject),
      };
    }
    
    return response as ApiResponse<FrontendProject>;
  },

  /**
   * Delete project
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete(`/api/projects/${id}`);
  },

  /**
   * Get project tasks
   */
  async getTasks(projectId: string): Promise<ApiResponse<FrontendTask[]>> {
    const response = await api.get<{ data: BackendTask[], pagination: any }>(
      '/api/tasks',
      { projectId }
    );
    
    if (response.success && response.data) {
      const tasks = response.data.data || response.data;
      const adaptedTasks = Array.isArray(tasks)
        ? tasks.map(adaptTask)
        : [];
      
      return {
        success: true,
        data: adaptedTasks,
      };
    }
    
    return response as ApiResponse<FrontendTask[]>;
  },

  /**
   * Add member to project
   */
  async addMember(projectId: string, userId: string, role?: string): Promise<ApiResponse<any>> {
    return api.post(`/api/projects/${projectId}/members`, {
      userId,
      role: role ? role.toUpperCase() : 'MEMBER',
    });
  },

  /**
   * Remove member from project
   */
  async removeMember(projectId: string, userId: string): Promise<ApiResponse<void>> {
    return api.delete(`/api/projects/${projectId}/members/${userId}`);
  },

  /**
   * Get project statistics
   */
  async getStats(projectId: string): Promise<ApiResponse<any>> {
    return api.get(`/api/projects/${projectId}/stats`);
  },
};

/**
 * Adapted Tasks Service
 */
export const adaptedTasksService = {
  /**
   * Get all tasks
   */
  async getAll(filters?: any): Promise<ApiResponse<FrontendTask[]>> {
    const response = await api.get<{ data: BackendTask[], pagination: any }>(
      '/api/tasks',
      filters
    );
    
    if (response.success && response.data) {
      const tasks = response.data.data || response.data;
      const adaptedTasks = Array.isArray(tasks)
        ? tasks.map(adaptTask)
        : [];
      
      return {
        success: true,
        data: adaptedTasks,
      };
    }
    
    return response as ApiResponse<FrontendTask[]>;
  },

  /**
   * Get user's assigned tasks
   */
  async getMyTasks(): Promise<ApiResponse<FrontendTask[]>> {
    const response = await api.get<{ data: BackendTask[] }>('/api/tasks/my');
    
    if (response.success && response.data) {
      const tasks = response.data.data || response.data;
      const adaptedTasks = Array.isArray(tasks)
        ? tasks.map(adaptTask)
        : [];
      
      return {
        success: true,
        data: adaptedTasks,
      };
    }
    
    return response as ApiResponse<FrontendTask[]>;
  },

  /**
   * Get task by ID
   */
  async getById(id: string): Promise<ApiResponse<FrontendTask>> {
    const response = await api.get<{ data: BackendTask }>(`/api/tasks/${id}`);
    
    if (response.success && response.data) {
      const task = response.data.data || response.data;
      return {
        success: true,
        data: adaptTask(task as BackendTask),
      };
    }
    
    return response as ApiResponse<FrontendTask>;
  },

  /**
   * Create new task
   */
  async create(data: any): Promise<ApiResponse<FrontendTask>> {
    const backendData = adaptTaskInput(data);
    const response = await api.post<{ data: BackendTask }>('/api/tasks', backendData);
    
    if (response.success && response.data) {
      const task = response.data.data || response.data;
      return {
        success: true,
        data: adaptTask(task as BackendTask),
      };
    }
    
    return response as ApiResponse<FrontendTask>;
  },

  /**
   * Update task
   */
  async update(id: string, data: any): Promise<ApiResponse<FrontendTask>> {
    const backendData = adaptTaskInput(data);
    const response = await api.put<{ data: BackendTask }>(`/api/tasks/${id}`, backendData);
    
    if (response.success && response.data) {
      const task = response.data.data || response.data;
      return {
        success: true,
        data: adaptTask(task as BackendTask),
      };
    }
    
    return response as ApiResponse<FrontendTask>;
  },

  /**
   * Delete task
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete(`/api/tasks/${id}`);
  },

  /**
   * Update task status
   */
  async updateStatus(id: string, status: string): Promise<ApiResponse<FrontendTask>> {
    const statusMap: Record<string, string> = {
      'todo': 'TODO',
      'in-progress': 'IN_PROGRESS',
      'review': 'IN_PROGRESS',
      'done': 'DONE',
    };

    const response = await api.put<{ data: BackendTask }>(`/api/tasks/${id}`, {
      status: statusMap[status] || 'TODO',
    });
    
    if (response.success && response.data) {
      const task = response.data.data || response.data;
      return {
        success: true,
        data: adaptTask(task as BackendTask),
      };
    }
    
    return response as ApiResponse<FrontendTask>;
  },

  /**
   * Bulk update task status
   */
  async bulkUpdateStatus(taskIds: string[], status: string): Promise<ApiResponse<any>> {
    const statusMap: Record<string, string> = {
      'todo': 'TODO',
      'in-progress': 'IN_PROGRESS',
      'review': 'IN_PROGRESS',
      'done': 'DONE',
    };

    return api.post('/api/tasks/bulk-status', {
      taskIds,
      status: statusMap[status] || 'TODO',
    });
  },

  /**
   * Get project task statistics
   */
  async getProjectStats(projectId: string): Promise<ApiResponse<any>> {
    return api.get(`/api/tasks/project/${projectId}/stats`);
  },
};

/**
 * Messages Service
 */
export const messagesService = {
  /**
   * Get project messages
   */
  async getProjectMessages(projectId: string, params?: any): Promise<ApiResponse<any>> {
    return api.get('/api/messages', { projectId, ...params });
  },

  /**
   * Create message
   */
  async create(data: {
    content: string;
    projectId: string;
    parentId?: string;
    mentions?: string[];
  }): Promise<ApiResponse<any>> {
    return api.post('/api/messages', data);
  },

  /**
   * Get message thread
   */
  async getThread(messageId: string): Promise<ApiResponse<any>> {
    return api.get(`/api/messages/${messageId}/thread`);
  },

  /**
   * Update message
   */
  async update(id: string, content: string): Promise<ApiResponse<any>> {
    return api.put(`/api/messages/${id}`, { content });
  },

  /**
   * Delete message
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete(`/api/messages/${id}`);
  },

  /**
   * Search messages
   */
  async search(query: string, projectIds?: string[]): Promise<ApiResponse<any>> {
    return api.get('/api/messages/search', { q: query, projectIds });
  },
};

/**
 * Notifications Service
 */
export const notificationsService = {
  /**
   * Get notifications
   */
  async getAll(params?: any): Promise<ApiResponse<any>> {
    return api.get('/api/notifications', params);
  },

  /**
   * Mark as read
   */
  async markAsRead(id: string): Promise<ApiResponse<any>> {
    return api.put(`/api/notifications/${id}/read`);
  },

  /**
   * Mark multiple as read
   */
  async markMultipleAsRead(ids: string[]): Promise<ApiResponse<any>> {
    return api.put('/api/notifications/read', { notificationIds: ids });
  },

  /**
   * Mark all as read
   */
  async markAllAsRead(): Promise<ApiResponse<any>> {
    return api.put('/api/notifications/read-all');
  },

  /**
   * Delete notification
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return api.delete(`/api/notifications/${id}`);
  },

  /**
   * Get preferences
   */
  async getPreferences(): Promise<ApiResponse<any>> {
    return api.get('/api/notifications/preferences');
  },

  /**
   * Update preferences
   */
  async updatePreferences(preferences: any): Promise<ApiResponse<any>> {
    return api.put('/api/notifications/preferences', preferences);
  },

  /**
   * Get statistics
   */
  async getStats(): Promise<ApiResponse<any>> {
    return api.get('/api/notifications/stats');
  },
};

// Export the adapted services as the default services to use in the frontend
export const projectsApi = adaptedProjectsService;
export const tasksApi = adaptedTasksService;
export const messagesApi = messagesService;
export const notificationsApi = notificationsService;
