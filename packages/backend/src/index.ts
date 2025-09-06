import { app, httpServer } from './app';
import { config } from './config/environment';
import { connectDatabase, disconnectDatabase } from './config/database';
import { WebSocketService } from './services/WebSocketService';
import { connectRedis, disconnectRedis } from './config/redis';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  // Close WebSocket connections
  const wsService = WebSocketService.getInstance();
  await wsService.shutdown();
  
  // Close server
  server.close(async () => {
    console.log('HTTP server closed.');
    
    // Disconnect from database
    await disconnectDatabase();
    
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Connect to Redis
    await connectRedis();
    
    // Start server
    const server = httpServer.listen(config.port, () => {
      console.log(`🚀 SynergySphere API Server running on port ${config.port}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${config.port}/health`);
      console.log(`🔌 WebSocket server initialized`);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
let server: any;

(async () => {
  server = await startServer();
})();

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));