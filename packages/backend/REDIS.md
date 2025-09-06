# Redis Configuration and Utilities

This document describes the Redis setup and utilities implemented for the SynergySphere backend.

## Overview

Redis is used for:
- Session storage and management
- Caching frequently accessed data
- Real-time data synchronization support

## Configuration

### Environment Variables

```bash
REDIS_URL="redis://localhost:6379"
```

### Connection Management

The Redis connection is managed through the `src/config/redis.ts` file:

```typescript
import { connectRedis, disconnectRedis, getRedisClient, isRedisConnected } from './config/redis';

// Connect to Redis
await connectRedis();

// Get Redis client instance
const redis = getRedisClient();

// Check connection status
const connected = isRedisConnected();

// Disconnect from Redis
await disconnectRedis();
```

## Session Storage

The `SessionStorage` class provides utilities for managing user sessions:

### Features

- JWT session storage with TTL
- Refresh token management
- Session cleanup and invalidation
- Multi-device session management

### Usage

```typescript
import { SessionStorage, SessionData } from './utils/sessionStorage';

// Store session
const sessionData: SessionData = {
  userId: 'user-123',
  email: 'user@example.com',
  name: 'John Doe',
  createdAt: Date.now(),
  lastActivity: Date.now(),
};

await SessionStorage.setSession('session-id', sessionData);

// Retrieve session
const session = await SessionStorage.getSession('session-id');

// Delete session
await SessionStorage.deleteSession('session-id');

// Refresh token management
await SessionStorage.setRefreshToken('token-id', 'user-id');
const userId = await SessionStorage.getRefreshToken('token-id');
await SessionStorage.deleteRefreshToken('token-id');

// Delete all user sessions (logout from all devices)
await SessionStorage.deleteAllUserSessions('user-id');
```

## Cache Utilities

The `Cache` class provides general-purpose caching functionality:

### Features

- Key-value caching with TTL
- Get-or-set pattern
- Batch operations
- Cache statistics
- Namespace support

### Usage

```typescript
import { Cache } from './utils/cache';

// Basic operations
await Cache.set('key', { data: 'value' }, { ttl: 3600 });
const value = await Cache.get('key');
await Cache.delete('key');

// Check existence
const exists = await Cache.exists('key');

// Get-or-set pattern
const result = await Cache.getOrSet('key', async () => {
  // Compute expensive operation
  return await fetchDataFromDatabase();
}, { ttl: 1800 });

// Increment numeric values
await Cache.increment('counter', 5);

// Batch operations
await Cache.setMultiple({
  'key1': { id: 1 },
  'key2': { id: 2 }
}, { ttl: 3600 });

const values = await Cache.getMultiple(['key1', 'key2']);

// Cache statistics
const stats = await Cache.getStats();
console.log(`Total keys: ${stats.totalKeys}, Memory usage: ${stats.memoryUsage}`);
```

## Specialized Cache Utilities

### UserCache

Optimized for user data caching:

```typescript
import { UserCache } from './utils/cache';

await UserCache.setUser('user-123', userData);
const user = await UserCache.getUser('user-123');
await UserCache.deleteUser('user-123');
```

### ProjectCache

Optimized for project and team data:

```typescript
import { ProjectCache } from './utils/cache';

await ProjectCache.setProject('project-123', projectData);
const project = await ProjectCache.getProject('project-123');

await ProjectCache.setProjectMembers('project-123', membersArray);
const members = await ProjectCache.getProjectMembers('project-123');
```

### TaskCache

Optimized for task data and project task lists:

```typescript
import { TaskCache } from './utils/cache';

await TaskCache.setTask('task-123', taskData);
const task = await TaskCache.getTask('task-123');

await TaskCache.setProjectTasks('project-123', tasksArray);
const tasks = await TaskCache.getProjectTasks('project-123');

// Invalidate project tasks cache when tasks change
await TaskCache.invalidateProjectTasks('project-123');
```

## Health Monitoring

Redis connection status is included in the health check endpoints:

- `GET /health` - Basic health check with Redis status
- `GET /health/detailed` - Detailed health check with Redis memory usage

## Testing

### Unit Tests

Run unit tests that mock Redis functionality:

```bash
npm run test:unit
```

### Integration Tests

Run integration tests that require a running Redis instance:

```bash
npm run test:integration
```

## Error Handling

All Redis utilities include proper error handling:

- Connection failures are logged and handled gracefully
- Cache misses return `null` instead of throwing errors
- Session operations include fallback mechanisms
- Network timeouts are handled with appropriate retries

## Performance Considerations

### TTL Settings

- Sessions: 15 minutes (configurable via JWT_EXPIRES_IN)
- Refresh tokens: 7 days (configurable via JWT_REFRESH_EXPIRES_IN)
- User cache: 30 minutes
- Project cache: 1 hour
- Task cache: 30 minutes

### Connection Pooling

Redis client uses connection pooling for optimal performance under load.

### Memory Management

- Automatic key expiration prevents memory leaks
- Cache statistics help monitor memory usage
- Batch operations reduce network overhead

## Security

- Redis connection uses authentication when configured
- Session data is JSON-serialized (no sensitive data exposure)
- Refresh tokens are stored separately from session data
- All cache keys use prefixes to prevent collisions

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure Redis server is running on the configured port
2. **Memory Issues**: Monitor cache statistics and adjust TTL values
3. **Performance**: Use batch operations for multiple cache operations
4. **Key Collisions**: Ensure proper prefixing for different data types

### Debugging

Enable Redis logging in development:

```typescript
// Redis client logs connection events automatically
// Check console output for connection status
```

### Monitoring

Use the health check endpoints to monitor Redis status in production:

```bash
curl http://localhost:3001/health/detailed
```