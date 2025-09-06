/**
 * API Adapter Layer V2
 * Enhanced version with proper type exports and better error handling
 */

import { api, type ApiResponse } from './api';

// ============= EXPORTED TYPES (Frontend format) =============

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

export interface Task {
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

export interface Message {
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
    avatar?: string;
  };
  repliesCount?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'task-assigned' | 'task-due' | 'mention' | 'project-update';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

// ============= ADAPTER FUNCTIONS WITH ERROR HANDLING =============

/**
 * Safely convert backend project to frontend format with null checks
 */
function adaptProject(backendProject: any): Project | null {
  try {
    if (!backendProject || !backendProject.id) {
      console.warn('Invalid backend project data:', backendProject);
      return null;
    }

    // Find owner from members
    const owner = backendProject.members?.find((m: any) => m.role === 'OWNER');
    
    return {
      id: backendProject.id,
      name: backendProject.name || 'Untitled Project',
      description: backendProject.description,
      status: 'active', // Default status
      priority: 'medium', // Default priority
      startDate: backendProject.createdAt,
      endDate: undefined,
      createdAt: backendProject.createdAt || new Date().toISOString(),
      updatedAt: backendProject.updatedAt || new Date().toISOString(),
      membersCount: backendProject.members?.length || backendProject._count?.members || 0,
      tasksCount: backendProject._count?.tasks || 0,
      messagesCount: backendProject._count?.messages || 0,
      owner: owner?.user ? {
        id: owner.user.id,
        name: owner.user.name || 'Unknown',
        email: owner.user.email || '',
        avatar: owner.user.avatar || undefined,
      } : undefined,
      members: backendProject.members?.map((m: any) => ({
        id: m.user?.id || m.userId,
        name: m.user?.name || 'Unknown',
        email: m.user?.email || '',
        avatar: m.user?.avatar || undefined,
        role: (m.role || 'MEMBER').toLowerCase() as 'owner' | 'admin' | 'member',
      })) || [],
    };
  } catch (error) {
    console.error('Error adapting project:', error, backendProject);
    return null;
  }
}

/**
 * Convert frontend project input to backend format
 */
function adaptProjectInput(frontendData: any): any {
  const backendData: any = {
    name: frontendData.name || 'Untitled Project',
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
 * Safely convert backend task to frontend format with null checks
 */
function adaptTask(backendTask: any): Task | null {
  try {
    if (!backendTask || !backendTask.id) {
      console.warn('Invalid backend task data:', backendTask);
      return null;
    }

    // Map backend status to frontend status
    const statusMap: Record<string, Task['status']> = {
      'TODO': 'todo',
      'IN_PROGRESS': 'in-progress',
      'DONE': 'done',
      'REVIEW': 'review',
    };

    // Map backend priority to frontend priority  
    const priorityMap: Record<string, Task['priority']> = {
      'LOW': 'low',
      'MEDIUM': 'medium',
      'HIGH': 'high',
      'CRITICAL': 'critical',
    };

    return {
      id: backendTask.id,
      title: backendTask.title || 'Untitled Task',
      description: backendTask.description,
      status: statusMap[backendTask.status] || 'todo',
      priority: priorityMap[backendTask.priority] || 'medium',
      projectId: backendTask.projectId,
      assignedTo: backendTask.assigneeId,
      assignedToUser: backendTask.assignee ? {
        id: backendTask.assignee.id,
        name: backendTask.assignee.name || 'Unknown',
        email: backendTask.assignee.email || '',
        avatar: backendTask.assignee.avatar || undefined,
      } : undefined,
      dueDate: backendTask.dueDate,
      createdAt: backendTask.createdAt || new Date().toISOString(),
      updatedAt: backendTask.updatedAt || new Date().toISOString(),
      completedAt: backendTask.completedAt,
      project: backendTask.project,
    };
  } catch (error) {
    console.error('Error adapting task:', error, backendTask);
    return null;
  }
}

/**
 * Convert frontend task input to backend format
 */
function adaptTaskInput(frontendData: any): any {
  // Map frontend status to backend status
  const statusMap: Record<string, string> = {
    'todo': 'TODO',
    'in-progress': 'IN_PROGRESS',
    'review': 'IN_PROGRESS', // Backend may not have review
    'done': 'DONE',
  };

  // Map frontend priority to backend priority
  const priorityMap: Record<string, string> = {
    'low': 'LOW',
    'medium': 'MEDIUM',
    'high': 'HIGH',
    'critical': 'HIGH', // Backend may not have critical
  };

  const backendData: any = {
    title: frontendData.title || 'Untitled Task',
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

/**
 * Safely handle API responses and extract data
 */
function extractData<T>(response: any): T | T[] | null {
  if (!response) return null;
  
  // Handle different response structures
  if (response.data?.data) {
    return response.data.data;
  }
  if (response.data) {
    return response.data;
  }
  return response;
}

/**
 * Filter out null values from arrays
 */
function filterNulls<T>(items: (T | null)[]): T[] {
  return items.filter((item): item is T => item !== null);
}

// ============= ENHANCED API SERVICES =============

/**
 * Projects Service with error handling and data transformation
 */
export const projectsApi = {
  async getAll(): Promise<ApiResponse<Project[]>> {
    try {
      const response = await api.get('/api/projects');
      const data = extractData(response);
      
      if (Array.isArray(data)) {
        const projects = filterNulls(data.map(adaptProject));
        return { success: true, data: projects };
      }
      
      return { success: false, error: 'Invalid response format' };
    } catch (error: any) {
      console.error('Projects getAll error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch projects' 
      };
    }
  },

  async getById(id: string): Promise<ApiResponse<Project>> {
    try {
      const response = await api.get(`/api/projects/${id}`);
      const data = extractData(response);
      const project = adaptProject(data);
      
      if (project) {
        return { success: true, data: project };
      }
      
      return { success: false, error: 'Project not found' };
    } catch (error: any) {
      console.error('Projects getById error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch project' 
      };
    }
  },

  async create(data: any): Promise<ApiResponse<Project>> {
    try {
      const backendData = adaptProjectInput(data);
      const response = await api.post('/api/projects', backendData);
      const projectData = extractData(response);
      const project = adaptProject(projectData);
      
      if (project) {
        return { success: true, data: project };
      }
      
      return { success: false, error: 'Failed to create project' };
    } catch (error: any) {
      console.error('Projects create error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to create project' 
      };
    }
  },

  async update(id: string, data: any): Promise<ApiResponse<Project>> {
    try {
      const backendData = adaptProjectInput(data);
      const response = await api.put(`/api/projects/${id}`, backendData);
      const projectData = extractData(response);
      const project = adaptProject(projectData);
      
      if (project) {
        return { success: true, data: project };
      }
      
      return { success: false, error: 'Failed to update project' };
    } catch (error: any) {
      console.error('Projects update error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to update project' 
      };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/api/projects/${id}`);
      return { success: true, data: undefined };
    } catch (error: any) {
      console.error('Projects delete error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to delete project' 
      };
    }
  },

  async getTasks(projectId: string): Promise<ApiResponse<Task[]>> {
    try {
      const response = await api.get('/api/tasks', { projectId });
      const data = extractData(response);
      
      if (Array.isArray(data)) {
        const tasks = filterNulls(data.map(adaptTask));
        return { success: true, data: tasks };
      }
      
      return { success: false, error: 'Invalid response format' };
    } catch (error: any) {
      console.error('Projects getTasks error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch tasks' 
      };
    }
  },

  async addMember(projectId: string, userId: string, role?: string): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(`/api/projects/${projectId}/members`, {
        userId,
        role: role ? role.toUpperCase() : 'MEMBER',
      });
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Projects addMember error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to add member' 
      };
    }
  },

  async removeMember(projectId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/api/projects/${projectId}/members/${userId}`);
      return { success: true, data: undefined };
    } catch (error: any) {
      console.error('Projects removeMember error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to remove member' 
      };
    }
  },

  async getStats(projectId: string): Promise<ApiResponse<any>> {
    try {
      const response = await api.get(`/api/projects/${projectId}/stats`);
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Projects getStats error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch stats' 
      };
    }
  },
};

/**
 * Tasks Service with error handling and data transformation
 */
export const tasksApi = {
  async getAll(filters?: any): Promise<ApiResponse<Task[]>> {
    try {
      const response = await api.get('/api/tasks', filters);
      const data = extractData(response);
      
      if (Array.isArray(data)) {
        const tasks = filterNulls(data.map(adaptTask));
        return { success: true, data: tasks };
      }
      
      return { success: false, error: 'Invalid response format' };
    } catch (error: any) {
      console.error('Tasks getAll error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch tasks' 
      };
    }
  },

  async getMyTasks(): Promise<ApiResponse<Task[]>> {
    try {
      const response = await api.get('/api/tasks/my');
      const data = extractData(response);
      
      if (Array.isArray(data)) {
        const tasks = filterNulls(data.map(adaptTask));
        return { success: true, data: tasks };
      }
      
      return { success: false, error: 'Invalid response format' };
    } catch (error: any) {
      console.error('Tasks getMyTasks error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch tasks' 
      };
    }
  },

  async getById(id: string): Promise<ApiResponse<Task>> {
    try {
      const response = await api.get(`/api/tasks/${id}`);
      const data = extractData(response);
      const task = adaptTask(data);
      
      if (task) {
        return { success: true, data: task };
      }
      
      return { success: false, error: 'Task not found' };
    } catch (error: any) {
      console.error('Tasks getById error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch task' 
      };
    }
  },

  async create(data: any): Promise<ApiResponse<Task>> {
    try {
      const backendData = adaptTaskInput(data);
      const response = await api.post('/api/tasks', backendData);
      const taskData = extractData(response);
      const task = adaptTask(taskData);
      
      if (task) {
        return { success: true, data: task };
      }
      
      return { success: false, error: 'Failed to create task' };
    } catch (error: any) {
      console.error('Tasks create error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to create task' 
      };
    }
  },

  async update(id: string, data: any): Promise<ApiResponse<Task>> {
    try {
      const backendData = adaptTaskInput(data);
      const response = await api.put(`/api/tasks/${id}`, backendData);
      const taskData = extractData(response);
      const task = adaptTask(taskData);
      
      if (task) {
        return { success: true, data: task };
      }
      
      return { success: false, error: 'Failed to update task' };
    } catch (error: any) {
      console.error('Tasks update error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to update task' 
      };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/api/tasks/${id}`);
      return { success: true, data: undefined };
    } catch (error: any) {
      console.error('Tasks delete error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to delete task' 
      };
    }
  },

  async updateStatus(id: string, status: string): Promise<ApiResponse<Task>> {
    try {
      const statusMap: Record<string, string> = {
        'todo': 'TODO',
        'in-progress': 'IN_PROGRESS',
        'review': 'IN_PROGRESS',
        'done': 'DONE',
      };

      const response = await api.put(`/api/tasks/${id}`, {
        status: statusMap[status] || 'TODO',
      });
      const taskData = extractData(response);
      const task = adaptTask(taskData);
      
      if (task) {
        return { success: true, data: task };
      }
      
      return { success: false, error: 'Failed to update task status' };
    } catch (error: any) {
      console.error('Tasks updateStatus error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to update task status' 
      };
    }
  },

  async bulkUpdateStatus(taskIds: string[], status: string): Promise<ApiResponse<any>> {
    try {
      const statusMap: Record<string, string> = {
        'todo': 'TODO',
        'in-progress': 'IN_PROGRESS',
        'review': 'IN_PROGRESS',
        'done': 'DONE',
      };

      const response = await api.post('/api/tasks/bulk-status', {
        taskIds,
        status: statusMap[status] || 'TODO',
      });
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Tasks bulkUpdateStatus error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to update tasks' 
      };
    }
  },

  async getProjectStats(projectId: string): Promise<ApiResponse<any>> {
    try {
      const response = await api.get(`/api/tasks/project/${projectId}/stats`);
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Tasks getProjectStats error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch stats' 
      };
    }
  },
};

/**
 * Messages Service
 */
export const messagesApi = {
  async getProjectMessages(projectId: string, params?: any): Promise<ApiResponse<Message[]>> {
    try {
      const response = await api.get('/api/messages', { projectId, ...params });
      const data = extractData(response);
      
      if (Array.isArray(data)) {
        return { success: true, data };
      }
      
      return { success: false, error: 'Invalid response format' };
    } catch (error: any) {
      console.error('Messages getProjectMessages error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch messages' 
      };
    }
  },

  async create(data: {
    content: string;
    projectId: string;
    parentId?: string;
    mentions?: string[];
  }): Promise<ApiResponse<Message>> {
    try {
      const response = await api.post('/api/messages', data);
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Messages create error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to create message' 
      };
    }
  },

  async getThread(messageId: string): Promise<ApiResponse<Message>> {
    try {
      const response = await api.get(`/api/messages/${messageId}/thread`);
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Messages getThread error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch thread' 
      };
    }
  },

  async update(id: string, content: string): Promise<ApiResponse<Message>> {
    try {
      const response = await api.put(`/api/messages/${id}`, { content });
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Messages update error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to update message' 
      };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/api/messages/${id}`);
      return { success: true, data: undefined };
    } catch (error: any) {
      console.error('Messages delete error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to delete message' 
      };
    }
  },

  async search(query: string, projectIds?: string[]): Promise<ApiResponse<Message[]>> {
    try {
      const response = await api.get('/api/messages/search', { q: query, projectIds });
      const data = extractData(response);
      
      if (Array.isArray(data)) {
        return { success: true, data };
      }
      
      return { success: false, error: 'Invalid response format' };
    } catch (error: any) {
      console.error('Messages search error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to search messages' 
      };
    }
  },
};

/**
 * Notifications Service
 */
export const notificationsApi = {
  async getAll(params?: any): Promise<ApiResponse<Notification[]>> {
    try {
      const response = await api.get('/api/notifications', params);
      const data = extractData(response);
      
      if (Array.isArray(data)) {
        return { success: true, data };
      }
      
      return { success: false, error: 'Invalid response format' };
    } catch (error: any) {
      console.error('Notifications getAll error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch notifications' 
      };
    }
  },

  async markAsRead(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await api.put(`/api/notifications/${id}/read`);
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Notifications markAsRead error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to mark as read' 
      };
    }
  },

  async markMultipleAsRead(ids: string[]): Promise<ApiResponse<any>> {
    try {
      const response = await api.put('/api/notifications/read', { notificationIds: ids });
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Notifications markMultipleAsRead error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to mark as read' 
      };
    }
  },

  async markAllAsRead(): Promise<ApiResponse<any>> {
    try {
      const response = await api.put('/api/notifications/read-all');
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Notifications markAllAsRead error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to mark all as read' 
      };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/api/notifications/${id}`);
      return { success: true, data: undefined };
    } catch (error: any) {
      console.error('Notifications delete error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to delete notification' 
      };
    }
  },

  async getPreferences(): Promise<ApiResponse<any>> {
    try {
      const response = await api.get('/api/notifications/preferences');
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Notifications getPreferences error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch preferences' 
      };
    }
  },

  async updatePreferences(preferences: any): Promise<ApiResponse<any>> {
    try {
      const response = await api.put('/api/notifications/preferences', preferences);
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Notifications updatePreferences error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to update preferences' 
      };
    }
  },

  async getStats(): Promise<ApiResponse<any>> {
    try {
      const response = await api.get('/api/notifications/stats');
      return { success: true, data: extractData(response) };
    } catch (error: any) {
      console.error('Notifications getStats error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Failed to fetch stats' 
      };
    }
  },
};

// Export an alias for backward compatibility
export const projectsService = projectsApi;
export const tasksService = tasksApi;
export const messagesService = messagesApi;
export const notificationsService = notificationsApi;
