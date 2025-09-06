import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { prisma } from '../config/database';
import { CacheService } from './CacheService';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  projects?: string[];
}

interface UserConnection {
  socketId: string;
  userId: string;
  connectedAt: Date;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketServer | null = null;
  private cacheService: CacheService;
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private socketToUser: Map<string, string> = new Map(); // socketId -> userId
  private projectRooms: Map<string, Set<string>> = new Map(); // projectId -> Set of userIds

  private constructor() {
    this.cacheService = new CacheService();
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: config.corsOrigin,
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
        socket.userId = decoded.userId;

        // Get user's projects
        const projects = await prisma.projectMember.findMany({
          where: { userId: decoded.userId },
          select: { projectId: true },
        });
        socket.projects = projects.map(p => p.projectId);

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      if (!socket.userId) return;

      console.log(`User ${socket.userId} connected (${socket.id})`);
      await this.handleUserConnect(socket);

      // Join project rooms
      if (socket.projects) {
        for (const projectId of socket.projects) {
          socket.join(`project:${projectId}`);
          this.addUserToProjectRoom(projectId, socket.userId);
        }
      }

      // Handle events
      this.setupSocketHandlers(socket);

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`User ${socket.userId} disconnected (${socket.id})`);
        await this.handleUserDisconnect(socket);
      });
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(socket: AuthenticatedSocket): void {
    // Join a specific project room
    socket.on('project:join', async (projectId: string) => {
      if (!socket.userId) return;

      // Verify user has access to project
      const member = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: socket.userId,
        },
      });

      if (member) {
        socket.join(`project:${projectId}`);
        this.addUserToProjectRoom(projectId, socket.userId);
        socket.emit('project:joined', { projectId });

        // Notify others in project
        socket.to(`project:${projectId}`).emit('user:joined_project', {
          userId: socket.userId,
          projectId,
        });
      }
    });

    // Leave a project room
    socket.on('project:leave', (projectId: string) => {
      if (!socket.userId) return;

      socket.leave(`project:${projectId}`);
      this.removeUserFromProjectRoom(projectId, socket.userId);
      socket.emit('project:left', { projectId });

      // Notify others in project
      socket.to(`project:${projectId}`).emit('user:left_project', {
        userId: socket.userId,
        projectId,
      });
    });

    // Handle typing indicators
    socket.on('typing:start', (data: { projectId: string; messageId?: string }) => {
      if (!socket.userId) return;

      socket.to(`project:${data.projectId}`).emit('user:typing', {
        userId: socket.userId,
        projectId: data.projectId,
        messageId: data.messageId,
      });
    });

    socket.on('typing:stop', (data: { projectId: string; messageId?: string }) => {
      if (!socket.userId) return;

      socket.to(`project:${data.projectId}`).emit('user:stopped_typing', {
        userId: socket.userId,
        projectId: data.projectId,
        messageId: data.messageId,
      });
    });

    // Handle presence updates
    socket.on('presence:update', async (status: 'online' | 'away' | 'busy' | 'offline') => {
      if (!socket.userId) return;

      await this.updateUserPresence(socket.userId, status);

      // Broadcast to all user's projects
      if (socket.projects) {
        for (const projectId of socket.projects) {
          socket.to(`project:${projectId}`).emit('user:presence_updated', {
            userId: socket.userId,
            status,
          });
        }
      }
    });

    // Handle cursor/selection sharing for collaborative features
    socket.on('cursor:update', (data: { projectId: string; taskId?: string; position: any }) => {
      if (!socket.userId) return;

      socket.to(`project:${data.projectId}`).emit('user:cursor_updated', {
        userId: socket.userId,
        ...data,
      });
    });

    // Handle real-time task board updates
    socket.on('task:drag_start', (data: { projectId: string; taskId: string }) => {
      if (!socket.userId) return;

      socket.to(`project:${data.projectId}`).emit('user:task_dragging', {
        userId: socket.userId,
        taskId: data.taskId,
      });
    });

    socket.on('task:drag_end', (data: { projectId: string; taskId: string; newStatus: string }) => {
      if (!socket.userId) return;

      socket.to(`project:${data.projectId}`).emit('user:task_dropped', {
        userId: socket.userId,
        taskId: data.taskId,
        newStatus: data.newStatus,
      });
    });

    // Handle ping for connection keepalive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  }

  /**
   * Handle user connection
   */
  private async handleUserConnect(socket: AuthenticatedSocket): Promise<void> {
    if (!socket.userId) return;

    // Add to connection maps
    if (!this.userConnections.has(socket.userId)) {
      this.userConnections.set(socket.userId, new Set());
    }
    this.userConnections.get(socket.userId)?.add(socket.id);
    this.socketToUser.set(socket.id, socket.userId);

    // Update user online status in cache
    await this.cacheService.set(`user:online:${socket.userId}`, true, 300); // 5 min TTL

    // Broadcast user online to their projects
    if (socket.projects) {
      for (const projectId of socket.projects) {
        socket.to(`project:${projectId}`).emit('user:online', {
          userId: socket.userId,
        });
      }
    }
  }

  /**
   * Handle user disconnection
   */
  private async handleUserDisconnect(socket: AuthenticatedSocket): Promise<void> {
    if (!socket.userId) return;

    // Remove from connection maps
    const userSockets = this.userConnections.get(socket.userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.userConnections.delete(socket.userId);
        
        // User has no more connections, mark as offline
        await this.cacheService.delete(`user:online:${socket.userId}`);

        // Broadcast user offline to their projects
        if (socket.projects) {
          for (const projectId of socket.projects) {
            socket.to(`project:${projectId}`).emit('user:offline', {
              userId: socket.userId,
            });
            this.removeUserFromProjectRoom(projectId, socket.userId);
          }
        }
      }
    }
    this.socketToUser.delete(socket.id);
  }

  /**
   * Send event to specific user
   */
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    const socketIds = this.userConnections.get(userId);
    if (socketIds && this.io) {
      for (const socketId of socketIds) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  /**
   * Send event to multiple users
   */
  async sendToUsers(userIds: string[], event: string, data: any): Promise<void> {
    for (const userId of userIds) {
      await this.sendToUser(userId, event, data);
    }
  }

  /**
   * Broadcast event to all users in a project
   */
  async broadcastToProject(projectId: string, event: string, data: any): Promise<void> {
    if (this.io) {
      this.io.to(`project:${projectId}`).emit(event, data);
    }
  }

  /**
   * Broadcast event to all users in multiple projects
   */
  async broadcastToProjects(projectIds: string[], event: string, data: any): Promise<void> {
    for (const projectId of projectIds) {
      await this.broadcastToProject(projectId, event, data);
    }
  }

  /**
   * Send notification to user (with persistence)
   */
  async sendNotification(userId: string, notification: any): Promise<void> {
    await this.sendToUser(userId, 'notification:new', notification);
  }

  /**
   * Get online users for a project
   */
  async getProjectOnlineUsers(projectId: string): Promise<string[]> {
    const users = this.projectRooms.get(projectId);
    return users ? Array.from(users) : [];
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  /**
   * Check if user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    const cached = await this.cacheService.get<boolean>(`user:online:${userId}`);
    return cached || this.userConnections.has(userId);
  }

  /**
   * Get user's active connections count
   */
  getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  /**
   * Update user presence status
   */
  private async updateUserPresence(userId: string, status: string): Promise<void> {
    await this.cacheService.set(`user:presence:${userId}`, status, 300);
  }

  /**
   * Add user to project room tracking
   */
  private addUserToProjectRoom(projectId: string, userId: string): void {
    if (!this.projectRooms.has(projectId)) {
      this.projectRooms.set(projectId, new Set());
    }
    this.projectRooms.get(projectId)?.add(userId);
  }

  /**
   * Remove user from project room tracking
   */
  private removeUserFromProjectRoom(projectId: string, userId: string): void {
    const room = this.projectRooms.get(projectId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.projectRooms.delete(projectId);
      }
    }
  }

  /**
   * Emit analytics event
   */
  async emitAnalyticsEvent(event: string, data: any): Promise<void> {
    if (this.io) {
      this.io.emit(`analytics:${event}`, data);
    }
  }

  /**
   * Get server statistics
   */
  getStats(): any {
    return {
      totalConnections: this.socketToUser.size,
      uniqueUsers: this.userConnections.size,
      projectRooms: this.projectRooms.size,
      connections: Array.from(this.userConnections.entries()).map(([userId, sockets]) => ({
        userId,
        connectionCount: sockets.size,
      })),
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.io) {
      // Notify all clients about shutdown
      this.io.emit('server:shutdown', {
        message: 'Server is shutting down for maintenance',
        timestamp: new Date().toISOString(),
      });

      // Close all connections
      this.io.disconnectSockets(true);

      // Clear maps
      this.userConnections.clear();
      this.socketToUser.clear();
      this.projectRooms.clear();

      // Close server
      await new Promise<void>((resolve) => {
        this.io?.close(() => {
          console.log('WebSocket server closed');
          resolve();
        });
      });
    }
  }
}

export default WebSocketService;
