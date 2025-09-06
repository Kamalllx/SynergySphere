import express from 'express';
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
import healthRoutes from './routes/health';

// Create Express application
const app = express();

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

export default app;