    import { api, type ApiResponse } from './api';

// Project types
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
  // Add more fields as needed based on your backend schema
}

export interface CreateProjectData {
  name: string;
  description?: string;
  status?: Project['status'];
  priority?: Project['priority'];
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  projectId: string;
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  // Add more fields as needed
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  projectId: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  id: string;
}

// Project API service
export const projectsService = {
  /**
   * Get all projects
   */
  getAll: (): Promise<ApiResponse<Project[]>> => {
    return api.get('/api/projects');
  },

  /**
   * Get project by ID
   */
  getById: (id: string): Promise<ApiResponse<Project>> => {
    return api.get(`/api/projects/${id}`);
  },

  /**
   * Create new project
   */
  create: (data: CreateProjectData): Promise<ApiResponse<Project>> => {
    return api.post('/api/projects', data);
  },

  /**
   * Update project
   */
  update: (id: string, data: Partial<CreateProjectData>): Promise<ApiResponse<Project>> => {
    return api.put(`/api/projects/${id}`, data);
  },

  /**
   * Delete project
   */
  delete: (id: string): Promise<ApiResponse<void>> => {
    return api.delete(`/api/projects/${id}`);
  },

  /**
   * Get project tasks
   */
  getTasks: (id: string): Promise<ApiResponse<Task[]>> => {
    return api.get(`/api/projects/${id}/tasks`);
  },
};

// Tasks API service
export const tasksService = {
  /**
   * Get all tasks
   */
  getAll: (): Promise<ApiResponse<Task[]>> => {
    return api.get('/api/tasks');
  },

  /**
   * Get task by ID
   */
  getById: (id: string): Promise<ApiResponse<Task>> => {
    return api.get(`/api/tasks/${id}`);
  },

  /**
   * Create new task
   */
  create: (data: CreateTaskData): Promise<ApiResponse<Task>> => {
    return api.post('/api/tasks', data);
  },

  /**
   * Update task
   */
  update: (id: string, data: Partial<CreateTaskData>): Promise<ApiResponse<Task>> => {
    return api.put(`/api/tasks/${id}`, data);
  },

  /**
   * Delete task
   */
  delete: (id: string): Promise<ApiResponse<void>> => {
    return api.delete(`/api/tasks/${id}`);
  },

  /**
   * Update task status
   */
  updateStatus: (id: string, status: Task['status']): Promise<ApiResponse<Task>> => {
    return api.patch(`/api/tasks/${id}`, { status });
  },
};
