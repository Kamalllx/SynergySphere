# Database Setup and Models

This document describes the database setup, models, and migration system for the SynergySphere backend.

## Overview

The backend uses PostgreSQL as the primary database with Prisma as the ORM. The database includes connection pooling, comprehensive models for all entities, and a migration system for schema management.

## Database Schema

### Core Models

#### User Model
- **Purpose**: Manages user accounts, authentication, and notification preferences
- **Key Features**: 
  - Secure password hashing with bcrypt
  - Notification preferences management
  - Last login tracking
  - Email uniqueness validation

#### Project Model
- **Purpose**: Manages team projects and project settings
- **Key Features**:
  - Project ownership and member management
  - Public/private project settings
  - Member invitation controls
  - Project statistics and analytics

#### Task Model
- **Purpose**: Manages tasks within projects
- **Key Features**:
  - Task status tracking (TODO, IN_PROGRESS, DONE)
  - Priority levels (LOW, MEDIUM, HIGH)
  - Assignment and due date management
  - Automatic completion timestamp tracking

#### Message Model
- **Purpose**: Handles project communication and threading
- **Key Features**:
  - Threaded message replies
  - @mention functionality with user notifications
  - Message editing with edit timestamps
  - Project-specific message channels

#### Notification Model
- **Purpose**: Manages user notifications and alerts
- **Key Features**:
  - Multiple notification types (task assignments, mentions, etc.)
  - Read/unread status tracking
  - Rich notification data with JSON storage
  - Bulk notification operations

## Database Connection

### Configuration
- **Connection Pooling**: Enabled via Prisma Client
- **Environment Variables**: Configured via `.env` file
- **Logging**: Development mode includes query logging
- **Error Handling**: Graceful connection failure handling

### Connection Management
```typescript
// Connect to database
await connectDatabase();

// Graceful shutdown
await disconnectDatabase();
```

## Model Methods

### User Model Methods
- `create(data)` - Create new user with hashed password
- `findById(id)` - Find user by ID
- `findByEmail(email)` - Find user by email
- `findByIdWithRelations(id)` - Find user with related data
- `findMany(filters)` - Find multiple users with filtering
- `update(id, data)` - Update user data
- `updateLastLogin(id)` - Update last login timestamp
- `verifyPassword(user, password)` - Verify user password
- `updatePassword(id, newPassword)` - Update user password
- `emailExists(email)` - Check if email is already registered
- `count(filters)` - Count users with optional filters
- `delete(id)` - Delete user account

### Project Model Methods
- `create(data)` - Create new project with owner membership
- `findById(id)` - Find project by ID
- `findByIdWithRelations(id)` - Find project with members, tasks, messages
- `findByUserId(userId, filters)` - Find user's projects
- `update(id, data)` - Update project data
- `delete(id)` - Delete project
- `addMember(projectId, userId, role)` - Add team member
- `removeMember(projectId, userId)` - Remove team member
- `updateMemberRole(projectId, userId, role)` - Update member role
- `isMember(projectId, userId)` - Check membership
- `getUserRole(projectId, userId)` - Get user's role in project
- `getStatistics(projectId)` - Get project statistics

### Task Model Methods
- `create(data)` - Create new task
- `findById(id)` - Find task by ID
- `findByIdWithRelations(id)` - Find task with project, assignee, creator
- `findMany(filters)` - Find tasks with filtering and sorting
- `update(id, data)` - Update task (auto-sets completion timestamp)
- `updateStatus(id, status)` - Update task status
- `assign(id, assigneeId)` - Assign task to user
- `unassign(id)` - Remove task assignment
- `delete(id)` - Delete task
- `getOverdueTasks(projectId?)` - Get overdue tasks
- `getTasksDueSoon(projectId?)` - Get tasks due within 24 hours
- `getProjectStatistics(projectId)` - Get task statistics for project
- `getUserStatistics(userId)` - Get task statistics for user

### Message Model Methods
- `create(data)` - Create new message
- `findById(id)` - Find message by ID
- `findByIdWithRelations(id)` - Find message with author, replies, parent
- `findMany(filters, page, limit)` - Find messages with pagination
- `findProjectMessages(projectId, page, limit)` - Find top-level project messages
- `findReplies(parentId)` - Find message replies
- `update(id, data)` - Update message (sets edit timestamp)
- `delete(id)` - Delete message
- `search(projectId, query, page, limit)` - Search messages in project
- `findMentions(userId, page, limit)` - Find messages mentioning user
- `getProjectMessageCount(projectId)` - Count project messages
- `getRecentMessages(projectId, limit)` - Get recent project messages
- `extractMentions(content)` - Extract @mentions from content
- `getProjectStatistics(projectId)` - Get message statistics

### Notification Model Methods
- `create(data)` - Create single notification
- `createMany(notifications)` - Create multiple notifications
- `findById(id)` - Find notification by ID
- `findMany(filters, page, limit)` - Find notifications with pagination
- `findUserNotifications(userId, page, limit)` - Find user's notifications
- `findUnreadNotifications(userId)` - Find unread notifications
- `markAsRead(id)` - Mark notification as read
- `markManyAsRead(ids)` - Mark multiple notifications as read
- `markAllAsRead(userId)` - Mark all user notifications as read
- `delete(id)` - Delete notification
- `deleteMany(ids)` - Delete multiple notifications
- `deleteOldNotifications(days)` - Clean up old notifications
- `getUnreadCount(userId)` - Get unread notification count
- `getUserStatistics(userId)` - Get notification statistics
- Helper methods for creating specific notification types:
  - `createTaskAssignmentNotification(...)`
  - `createTaskDueNotification(...)`
  - `createMentionNotification(...)`
  - `createProjectUpdateNotification(...)`
  - `notifyProjectMembers(...)`

## Migration System

### Migration Files
- **Location**: `prisma/migrations/`
- **Initial Migration**: `20250906_init/migration.sql`
- **Lock File**: `migration_lock.toml` (tracks database provider)

### Running Migrations
```bash
# Generate Prisma client
npm run db:generate

# Run migrations (when database is available)
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

## Testing

### Unit Tests
- **Location**: `tests/models/unit.test.ts`
- **Coverage**: All model methods and utilities
- **Setup**: No database connection required

### Integration Tests
- **Location**: `tests/models/*.test.ts`
- **Requirements**: PostgreSQL database connection
- **Setup**: Automatic test data cleanup

### Running Tests
```bash
# Unit tests (no database required)
npx jest tests/models/unit.test.ts --setupFilesAfterEnv ./tests/unit-setup.ts

# Integration tests (requires database)
npm test

# Test coverage
npm run test:coverage
```

## Environment Variables

Required environment variables for database connection:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
```

## Performance Considerations

### Database Optimization
- **Connection Pooling**: Automatic via Prisma Client
- **Indexing**: Proper indexes on frequently queried columns
- **Query Optimization**: Efficient queries with proper relations
- **Caching**: Redis integration for frequently accessed data

### Model Features
- **Pagination**: Built-in pagination for large result sets
- **Filtering**: Comprehensive filtering options
- **Sorting**: Optimized sorting by relevant fields
- **Statistics**: Efficient aggregation queries
- **Bulk Operations**: Support for bulk create/update/delete operations

## Security Features

### Data Protection
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Comprehensive data validation
- **SQL Injection Prevention**: Parameterized queries via Prisma
- **Cascade Deletes**: Proper foreign key constraints

### Access Control
- **Role-Based Access**: Project member roles (OWNER, ADMIN, MEMBER)
- **Permission Checks**: Built-in membership and role validation
- **Data Isolation**: Project-scoped data access

## Error Handling

### Database Errors
- **Connection Failures**: Graceful error handling and retry logic
- **Constraint Violations**: Proper error messages for unique constraints
- **Transaction Rollbacks**: Automatic rollback on transaction failures
- **Validation Errors**: Clear validation error messages

### Model Validation
- **Required Fields**: Proper validation of required data
- **Data Types**: Type safety via TypeScript and Prisma
- **Business Logic**: Custom validation for business rules
- **Relationship Integrity**: Foreign key constraint validation