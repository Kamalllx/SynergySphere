# SynergySphere Backend API Documentation

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Projects](#projects-api)
  - [Tasks](#tasks-api)
  - [Messages](#messages-api)
  - [Notifications](#notifications-api)
- [WebSocket Events](#websocket-events)
- [Services Documentation](#services-documentation)
- [Database Schema](#database-schema)
- [Error Handling](#error-handling)
- [Setup Instructions](#setup-instructions)

## Overview

SynergySphere Backend is a production-ready collaboration platform API built with:
- **Node.js & Express.js** - Server framework
- **TypeScript** - Type safety
- **PostgreSQL** - Primary database
- **Prisma ORM** - Database management
- **Redis** - Caching and session management
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Joi** - Request validation

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   API Gateway   │────▶│   Services      │
│   (React PWA)   │     │   (Express)     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         │                       │                        ▼
         │                       │              ┌─────────────────┐
         │                       │              │   PostgreSQL    │
         │                       │              │   (AWS RDS)     │
         ▼                       ▼              └─────────────────┘
┌─────────────────┐     ┌─────────────────┐             │
│   WebSocket     │     │     Redis       │             ▼
│   (Socket.io)   │     │    (Cache)      │    ┌─────────────────┐
└─────────────────┘     └─────────────────┘    │   Prisma ORM    │
                                                └─────────────────┘
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

JWT Payload Structure:
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "name": "User Name"
}
```

## API Endpoints

### Base URL
- Development: `http://localhost:3001`
- Production: `https://api.synergyphere.com`

### Response Format
All API responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "data": {},
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

---

## Projects API

### Create Project
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Project Name",
  "description": "Project description",
  "isPublic": false,
  "allowMemberInvites": true
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Project Name",
    "description": "Project description",
    "ownerId": "uuid",
    "isPublic": false,
    "allowMemberInvites": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "members": [...]
  }
}
```

### Get User's Projects
```http
GET /api/projects?limit=20&offset=0&search=query&sortBy=name&sortOrder=asc
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

### Get Project Details
```http
GET /api/projects/:projectId
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Project Name",
    "members": [
      {
        "userId": "uuid",
        "role": "OWNER",
        "user": {
          "id": "uuid",
          "name": "User Name",
          "email": "user@example.com",
          "avatar": null
        }
      }
    ],
    "_count": {
      "tasks": 10,
      "messages": 25
    }
  }
}
```

### Update Project
```http
PUT /api/projects/:projectId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "isPublic": true
}

Response: 200 OK
```

### Delete Project
```http
DELETE /api/projects/:projectId
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### Add Project Member
```http
POST /api/projects/:projectId/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "uuid",
  "role": "MEMBER"  // MEMBER | ADMIN
}

Response: 201 Created
```

### Remove Project Member
```http
DELETE /api/projects/:projectId/members/:userId
Authorization: Bearer <token>

Response: 200 OK
```

### Update Member Role
```http
PUT /api/projects/:projectId/members/:userId/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "ADMIN"  // MEMBER | ADMIN
}

Response: 200 OK
```

### Get Project Statistics
```http
GET /api/projects/:projectId/stats
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "totalTasks": 50,
    "totalMessages": 120,
    "totalMembers": 5,
    "tasksByStatus": {
      "TODO": 20,
      "IN_PROGRESS": 15,
      "DONE": 15
    },
    "tasksByPriority": {
      "LOW": 10,
      "MEDIUM": 25,
      "HIGH": 15
    },
    "completionRate": 30
  }
}
```

---

## Tasks API

### Create Task
```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Task Title",
  "description": "Task description",
  "projectId": "uuid",
  "assigneeId": "uuid",
  "dueDate": "2024-12-31T23:59:59Z",
  "priority": "HIGH",  // LOW | MEDIUM | HIGH
  "status": "TODO"     // TODO | IN_PROGRESS | DONE
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Task Title",
    "status": "TODO",
    "priority": "HIGH",
    "assignee": {
      "id": "uuid",
      "name": "Assignee Name"
    },
    "project": {
      "id": "uuid",
      "name": "Project Name"
    }
  }
}
```

### Get Tasks with Filters
```http
GET /api/tasks?projectId=uuid&status=TODO&priority=HIGH&assigneeId=uuid&overdue=true
Authorization: Bearer <token>

Query Parameters:
- projectId: string (uuid)
- assigneeId: string (uuid) | null
- creatorId: string (uuid)
- status: TODO | IN_PROGRESS | DONE (can be array)
- priority: LOW | MEDIUM | HIGH (can be array)
- dueDateFrom: ISO date string
- dueDateTo: ISO date string
- search: string
- overdue: boolean
- limit: number (1-100)
- offset: number
- sortBy: title | dueDate | priority | createdAt | updatedAt
- sortOrder: asc | desc

Response: 200 OK
```

### Get User's Assigned Tasks
```http
GET /api/tasks/my
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "My Task",
      "status": "IN_PROGRESS",
      "dueDate": "2024-12-31T23:59:59Z",
      "project": {
        "id": "uuid",
        "name": "Project Name"
      }
    }
  ]
}
```

### Update Task
```http
PUT /api/tasks/:taskId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "IN_PROGRESS",
  "assigneeId": "uuid",
  "priority": "MEDIUM"
}

Response: 200 OK
```

### Delete Task
```http
DELETE /api/tasks/:taskId
Authorization: Bearer <token>

Response: 200 OK
```

### Bulk Update Task Status
```http
POST /api/tasks/bulk-status
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskIds": ["uuid1", "uuid2", "uuid3"],
  "status": "DONE"
}

Response: 200 OK
{
  "success": true,
  "message": "3 tasks updated successfully",
  "data": { "count": 3 }
}
```

### Get Project Task Statistics
```http
GET /api/tasks/project/:projectId/stats
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "total": 50,
    "byStatus": {
      "TODO": 20,
      "IN_PROGRESS": 15,
      "DONE": 15
    },
    "byPriority": {
      "LOW": 10,
      "MEDIUM": 25,
      "HIGH": 15
    },
    "overdue": 5,
    "dueSoon": 8,
    "unassigned": 3,
    "completedThisWeek": 10,
    "averageCompletionTime": 48
  }
}
```

---

## Messages API

### Create Message
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Message content with @[User Name](userId)",
  "projectId": "uuid",
  "parentId": "uuid",  // Optional - for replies
  "mentions": ["userId1", "userId2"]  // Optional
}

Response: 201 Created
```

### Get Project Messages
```http
GET /api/messages?projectId=uuid&parentId=null&search=query
Authorization: Bearer <token>

Query Parameters:
- projectId: string (required)
- parentId: string | null (null for root messages)
- authorId: string
- search: string
- hasReplies: boolean
- mentions: string (userId)
- dateFrom: ISO date
- dateTo: ISO date
- limit: number
- offset: number
- sortOrder: asc | desc

Response: 200 OK
```

### Get Message Thread
```http
GET /api/messages/:messageId/thread
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "Message content",
    "author": {...},
    "replies": [
      {
        "id": "uuid",
        "content": "Reply content",
        "author": {...},
        "replies": [...]
      }
    ],
    "_count": {
      "replies": 5
    }
  }
}
```

### Update Message
```http
PUT /api/messages/:messageId
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated message content"
}

Note: Can only edit within 15 minutes of creation

Response: 200 OK
```

### Delete Message
```http
DELETE /api/messages/:messageId
Authorization: Bearer <token>

Note: Cannot delete if message has replies

Response: 200 OK
```

### Get User Mentions
```http
GET /api/messages/mentions?projectId=uuid&limit=20
Authorization: Bearer <token>

Response: 200 OK
```

### Search Messages
```http
GET /api/messages/search?q=search+query&projectIds[]=uuid1&projectIds[]=uuid2
Authorization: Bearer <token>

Response: 200 OK
```

---

## Notifications API

### Get Notifications
```http
GET /api/notifications?type=TASK_ASSIGNED&isRead=false
Authorization: Bearer <token>

Query Parameters:
- type: TASK_ASSIGNED | TASK_DUE | MENTION | PROJECT_UPDATE (can be array)
- isRead: boolean
- dateFrom: ISO date
- dateTo: ISO date
- limit: number
- offset: number

Response: 200 OK
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 50,
    "unread": 12,
    "limit": 20,
    "offset": 0
  }
}
```

### Mark Notification as Read
```http
PUT /api/notifications/:notificationId/read
Authorization: Bearer <token>

Response: 200 OK
```

### Mark Multiple as Read
```http
PUT /api/notifications/read
Authorization: Bearer <token>
Content-Type: application/json

{
  "notificationIds": ["uuid1", "uuid2"]
}

Response: 200 OK
```

### Mark All as Read
```http
PUT /api/notifications/read-all
Authorization: Bearer <token>

Response: 200 OK
```

### Delete Notification
```http
DELETE /api/notifications/:notificationId
Authorization: Bearer <token>

Response: 200 OK
```

### Get Notification Preferences
```http
GET /api/notifications/preferences
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "emailNotifications": true,
    "pushNotifications": true,
    "taskAssignments": true,
    "projectUpdates": true,
    "mentions": true
  }
}
```

### Update Notification Preferences
```http
PUT /api/notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "emailNotifications": false,
  "pushNotifications": true,
  "mentions": true
}

Response: 200 OK
```

### Get Notification Statistics
```http
GET /api/notifications/stats
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "total": 150,
    "unread": 12,
    "todayCount": 5,
    "weekCount": 35,
    "averagePerDay": 5,
    "byType": {
      "TASK_ASSIGNED": 50,
      "MENTION": 30,
      "PROJECT_UPDATE": 40,
      "TASK_DUE": 30
    }
  }
}
```

---

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'jwt_token'
  }
});
```

### Client Events (Emit)

#### Join Project Room
```javascript
socket.emit('project:join', projectId);
```

#### Leave Project Room
```javascript
socket.emit('project:leave', projectId);
```

#### Typing Indicators
```javascript
socket.emit('typing:start', { projectId, messageId });
socket.emit('typing:stop', { projectId, messageId });
```

#### Presence Update
```javascript
socket.emit('presence:update', 'online'); // online | away | busy | offline
```

#### Task Board Updates
```javascript
socket.emit('task:drag_start', { projectId, taskId });
socket.emit('task:drag_end', { projectId, taskId, newStatus });
```

#### Cursor Sharing
```javascript
socket.emit('cursor:update', { projectId, taskId, position: { x, y } });
```

### Server Events (Listen)

#### Connection Events
```javascript
socket.on('project:joined', ({ projectId }) => {});
socket.on('project:left', ({ projectId }) => {});
```

#### User Activity
```javascript
socket.on('user:online', ({ userId }) => {});
socket.on('user:offline', ({ userId }) => {});
socket.on('user:joined_project', ({ userId, projectId }) => {});
socket.on('user:left_project', ({ userId, projectId }) => {});
```

#### Typing Indicators
```javascript
socket.on('user:typing', ({ userId, projectId, messageId }) => {});
socket.on('user:stopped_typing', ({ userId, projectId, messageId }) => {});
```

#### Real-time Updates
```javascript
// Task events
socket.on('task:created', ({ task, createdBy }) => {});
socket.on('task:updated', ({ task, updatedBy, changes }) => {});
socket.on('task:deleted', ({ taskId, deletedBy }) => {});
socket.on('tasks:bulk_updated', ({ taskIds, status, updatedBy }) => {});

// Message events
socket.on('message:created', ({ message, isReply }) => {});
socket.on('message:updated', ({ message }) => {});
socket.on('message:deleted', ({ messageId, deletedBy }) => {});

// Notification events
socket.on('notification:new', ({ notification }) => {});
socket.on('notification:read', ({ notificationId }) => {});
socket.on('notifications:bulk_read', ({ notificationIds, count }) => {});
```

#### Collaborative Features
```javascript
socket.on('user:cursor_updated', ({ userId, projectId, taskId, position }) => {});
socket.on('user:task_dragging', ({ userId, taskId }) => {});
socket.on('user:task_dropped', ({ userId, taskId, newStatus }) => {});
```

---

## Services Documentation

### ProjectService
- **Purpose**: Manages all project-related operations
- **Key Methods**:
  - `createProject()`: Creates new project with owner
  - `getProjectById()`: Gets project with authorization check
  - `getUserProjects()`: Lists user's projects with pagination
  - `updateProject()`: Updates project (admin/owner only)
  - `deleteProject()`: Deletes project (owner only)
  - `addMember()`: Adds member to project
  - `removeMember()`: Removes member from project
  - `updateMemberRole()`: Changes member role (owner only)
  - `getProjectStats()`: Returns project statistics

### TaskService
- **Purpose**: Handles task management operations
- **Key Methods**:
  - `createTask()`: Creates task with notifications
  - `getTaskById()`: Gets task with authorization
  - `getTasks()`: Advanced filtering and pagination
  - `updateTask()`: Updates task with change tracking
  - `deleteTask()`: Deletes task (creator/admin only)
  - `bulkUpdateStatus()`: Updates multiple tasks
  - `getProjectTaskStats()`: Task statistics for project
  - `getUserTasks()`: Gets user's assigned tasks

### MessageService
- **Purpose**: Manages threaded discussions
- **Key Methods**:
  - `createMessage()`: Creates message/reply with mentions
  - `getProjectMessages()`: Gets messages with filters
  - `getMessageThread()`: Gets full message thread
  - `updateMessage()`: Edits message (15-min window)
  - `deleteMessage()`: Deletes message (no replies)
  - `getUserMentions()`: Gets messages mentioning user
  - `searchMessages()`: Full-text message search
  - `getProjectMessageStats()`: Message statistics

### NotificationService
- **Purpose**: Manages user notifications
- **Key Methods**:
  - `createNotification()`: Creates notification with preferences check
  - `createBulkNotifications()`: Creates notifications for multiple users
  - `getUserNotifications()`: Gets user's notifications
  - `markAsRead()`: Marks notification as read
  - `markMultipleAsRead()`: Bulk mark as read
  - `deleteNotification()`: Deletes notification
  - `updateUserPreferences()`: Updates notification preferences
  - `scheduleTaskDueNotifications()`: Schedules due date reminders

### WebSocketService
- **Purpose**: Real-time communication
- **Key Methods**:
  - `initialize()`: Sets up Socket.io server
  - `sendToUser()`: Sends event to specific user
  - `broadcastToProject()`: Broadcasts to project room
  - `getProjectOnlineUsers()`: Gets online users in project
  - `isUserOnline()`: Checks user online status

### CacheService
- **Purpose**: Redis caching layer
- **Key Methods**:
  - `set()`: Stores value with optional TTL
  - `get()`: Retrieves cached value
  - `invalidatePattern()`: Clears cache by pattern
  - `checkRateLimit()`: Rate limiting helper
  - `cacheable()`: Function result caching wrapper

### EmailService
- **Purpose**: Email notifications
- **Key Methods**:
  - `sendEmail()`: Sends email with template
  - `sendWelcomeEmail()`: Welcome email for new users
  - `sendTaskAssignmentEmail()`: Task assignment notification
  - `sendProjectInviteEmail()`: Project invitation
  - `sendTaskReminderEmail()`: Due date reminders
  - `sendDailyDigestEmail()`: Daily activity summary

---

## Database Schema

### User
```prisma
model User {
  id                 String    @id @default(uuid())
  email              String    @unique
  name               String
  password           String
  avatar             String?
  emailNotifications Boolean   @default(true)
  pushNotifications  Boolean   @default(true)
  taskAssignments    Boolean   @default(true)
  projectUpdates     Boolean   @default(true)
  mentions           Boolean   @default(true)
  // Relations
  ownedProjects      Project[]
  projectMembers     ProjectMember[]
  createdTasks       Task[]
  assignedTasks      Task[]
  messages           Message[]
  notifications      Notification[]
}
```

### Project
```prisma
model Project {
  id                 String    @id @default(uuid())
  name               String
  description        String?
  ownerId            String
  isPublic           Boolean   @default(false)
  allowMemberInvites Boolean   @default(true)
  // Relations
  owner              User
  members            ProjectMember[]
  tasks              Task[]
  messages           Message[]
}
```

### Task
```prisma
model Task {
  id          String       @id @default(uuid())
  title       String
  description String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  projectId   String
  assigneeId  String?
  creatorId   String
  dueDate     DateTime?
  completedAt DateTime?
  // Relations
  project     Project
  assignee    User?
  creator     User
}
```

### Message
```prisma
model Message {
  id        String   @id @default(uuid())
  content   String
  projectId String
  authorId  String
  parentId  String?
  mentions  String[] @default([])
  editedAt  DateTime?
  // Relations
  project   Project
  author    User
  parent    Message?
  replies   Message[]
}
```

### Notification
```prisma
model Notification {
  id        String           @id @default(uuid())
  userId    String
  type      NotificationType
  title     String
  message   String
  data      Json             @default("{}")
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())
  // Relations
  user      User
}
```

---

## Error Handling

### Error Response Structure
```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Detailed error message"
    }
  ]
}
```

### HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Common Error Messages
- "Authentication required"
- "Invalid or expired token"
- "Insufficient permissions"
- "Resource not found"
- "Validation failed"
- "You are not a member of this project"
- "Task not found or access denied"
- "Cannot delete message with replies"
- "Cannot edit message after 15 minutes"

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd SynergySphere/packages/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Environment Variables**
```env
# Server
NODE_ENV=development
PORT=3001

# Database (AWS RDS)
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=SynergySphere <noreply@synergyphere.com>

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

5. **Run database migrations**
```bash
npx prisma generate
npx prisma migrate dev
```

6. **Start development server**
```bash
npm run dev
```

7. **Run tests**
```bash
npm test
```

### Docker Setup

```bash
# Using Docker Compose
docker-compose -f docker-compose.dev.yml up

# Or build and run separately
docker build -t synergysphere-backend .
docker run -p 3001:3001 synergysphere-backend
```

### Production Deployment

1. **Build the application**
```bash
npm run build
```

2. **Run production server**
```bash
npm start
```

3. **Health Check**
```bash
curl http://localhost:3001/health
```

---

## Rate Limiting

Default limits:
- 100 requests per 15 minutes per IP
- WebSocket: 50 events per minute per user
- File uploads: 10MB max size

---

## Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- SQL injection prevention (Prisma)
- XSS protection (Helmet)
- CORS configuration
- Rate limiting
- Input validation (Joi)
- Role-based access control

---

## Performance Optimizations

- Redis caching for frequently accessed data
- Database query optimization with indexes
- Connection pooling
- Lazy loading and pagination
- WebSocket connection management
- Efficient data structures

---

## Monitoring & Logging

### Health Check Endpoints
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status

### Metrics Available
- Database connection status
- Redis connection status
- Memory usage
- Request count
- WebSocket connections
- Cache hit/miss ratio

---

## Support & Contact

For issues or questions about the backend API:
- GitHub Issues: [repository-url]/issues
- Email: support@synergyphere.com
- Documentation: https://docs.synergyphere.com

---

## License

MIT License - See LICENSE file for details
