import express from 'express';
import { createServer } from 'http';
import { config } from './config/environment';
import { connectDatabase } from './config/database';
import {
  corsMiddleware,
  helmetMiddleware,
  compressionMiddleware,
  rateLimitMiddleware,
  requestLogger,
} from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { WebSocketService } from './services/WebSocketService';

// Import routes
import healthRoutes from './routes/health';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';

// Create Express application and HTTP server
const app = express();
const httpServer = createServer(app);

// Initialize WebSocket service
const wsService = WebSocketService.getInstance();
wsService.initialize(httpServer);

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(compressionMiddleware);
app.use(rateLimitMiddleware);

// Request logging
if (config.nodeEnv === 'development') {
  app.use(requestLogger);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/health', healthRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// API base route
app.get('/', (req, res) => {
  res.json({
    message: 'SynergySphere API Server',
    version: '1.0.0',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export { app, httpServer };
export default app;
