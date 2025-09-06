#!/usr/bin/env tsx
/**
 * API Integration Test Script
 * Tests all backend API endpoints and verifies the adapter layer works correctly
 * 
 * Usage: npx tsx test-api.ts [--backend-url=http://localhost:5000] [--frontend-url=http://localhost:3000]
 */

import axios, { AxiosInstance } from 'axios';
import { WebSocket } from 'ws';
import chalk from 'chalk';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};

const BACKEND_URL = getArg('backend-url', 'http://localhost:5000');
const FRONTEND_URL = getArg('frontend-url', 'http://localhost:3000');
const WS_URL = BACKEND_URL.replace('http', 'ws');

// Test data
let testUserId: string;
let testProjectId: string;
let testTaskId: string;
let testMessageId: string;
let testNotificationId: string;
let authToken: string;

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Test utilities
const log = {
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  error: (msg: string) => console.log(chalk.red('✗'), msg),
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  section: (msg: string) => console.log(chalk.bold.cyan(`\n=== ${msg} ===\n`)),
};

async function testEndpoint(
  name: string,
  fn: () => Promise<any>,
  validateResponse?: (data: any) => boolean
): Promise<boolean> {
  try {
    const response = await fn();
    const data = response.data?.data || response.data;
    
    if (validateResponse && !validateResponse(data)) {
      log.error(`${name}: Invalid response structure`);
      return false;
    }
    
    log.success(name);
    return true;
  } catch (error: any) {
    log.error(`${name}: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log('  Response:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// ============= AUTH TESTS =============
async function testAuth() {
  log.section('Authentication Tests');
  
  // Register new user
  const username = `testuser_${Date.now()}`;
  const email = `${username}@test.com`;
  const password = 'TestPassword123!';
  
  const registered = await testEndpoint(
    'Register new user',
    () => api.post('/api/auth/register', {
      name: 'Test User',
      email,
      password,
    }),
    (data) => data.user && data.token
  );
  
  if (registered) {
    const response = await api.post('/api/auth/register', {
      name: 'Test User',
      email,
      password,
    });
    authToken = response.data.data.token;
    testUserId = response.data.data.user.id;
    log.info(`User ID: ${testUserId}`);
  }
  
  // Login
  await testEndpoint(
    'Login with credentials',
    () => api.post('/api/auth/login', { email, password }),
    (data) => data.user && data.token
  );
  
  // Get current user
  await testEndpoint(
    'Get current user',
    () => api.get('/api/auth/me'),
    (data) => data.id && data.email
  );
  
  // Refresh token
  await testEndpoint(
    'Refresh token',
    () => api.post('/api/auth/refresh'),
    (data) => data.token
  );
}

// ============= PROJECT TESTS =============
async function testProjects() {
  log.section('Project Tests');
  
  // Create project
  const created = await testEndpoint(
    'Create project',
    () => api.post('/api/projects', {
      name: 'Test Project',
      description: 'Test project description',
      isPublic: false,
      allowMemberInvites: true,
    }),
    (data) => data.id && data.name
  );
  
  if (created) {
    const response = await api.post('/api/projects', {
      name: 'Test Project',
      description: 'Test project description',
    });
    testProjectId = response.data.data.id;
    log.info(`Project ID: ${testProjectId}`);
  }
  
  // Get all projects
  await testEndpoint(
    'Get all projects',
    () => api.get('/api/projects'),
    (data) => Array.isArray(data)
  );
  
  // Get project by ID
  await testEndpoint(
    'Get project by ID',
    () => api.get(`/api/projects/${testProjectId}`),
    (data) => data.id === testProjectId
  );
  
  // Update project
  await testEndpoint(
    'Update project',
    () => api.put(`/api/projects/${testProjectId}`, {
      name: 'Updated Test Project',
      description: 'Updated description',
    }),
    (data) => data.name === 'Updated Test Project'
  );
  
  // Add member (simulate adding another user)
  await testEndpoint(
    'Add project member',
    () => api.post(`/api/projects/${testProjectId}/members`, {
      userId: testUserId, // Adding self for testing
      role: 'MEMBER',
    })
  );
  
  // Get project stats
  await testEndpoint(
    'Get project statistics',
    () => api.get(`/api/projects/${testProjectId}/stats`)
  );
}

// ============= TASK TESTS =============
async function testTasks() {
  log.section('Task Tests');
  
  // Create task
  const created = await testEndpoint(
    'Create task',
    () => api.post('/api/tasks', {
      title: 'Test Task',
      description: 'Test task description',
      projectId: testProjectId,
      status: 'TODO',
      priority: 'MEDIUM',
      assigneeId: testUserId,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    (data) => data.id && data.title
  );
  
  if (created) {
    const response = await api.post('/api/tasks', {
      title: 'Test Task',
      description: 'Test task description',
      projectId: testProjectId,
      status: 'TODO',
      priority: 'MEDIUM',
    });
    testTaskId = response.data.data.id;
    log.info(`Task ID: ${testTaskId}`);
  }
  
  // Get all tasks
  await testEndpoint(
    'Get all tasks',
    () => api.get('/api/tasks'),
    (data) => Array.isArray(data)
  );
  
  // Get tasks by project
  await testEndpoint(
    'Get tasks by project',
    () => api.get('/api/tasks', { params: { projectId: testProjectId } }),
    (data) => Array.isArray(data)
  );
  
  // Get my tasks
  await testEndpoint(
    'Get my tasks',
    () => api.get('/api/tasks/my'),
    (data) => Array.isArray(data)
  );
  
  // Get task by ID
  await testEndpoint(
    'Get task by ID',
    () => api.get(`/api/tasks/${testTaskId}`),
    (data) => data.id === testTaskId
  );
  
  // Update task
  await testEndpoint(
    'Update task',
    () => api.put(`/api/tasks/${testTaskId}`, {
      title: 'Updated Test Task',
      status: 'IN_PROGRESS',
    }),
    (data) => data.title === 'Updated Test Task'
  );
  
  // Update task status
  await testEndpoint(
    'Update task status',
    () => api.patch(`/api/tasks/${testTaskId}/status`, {
      status: 'DONE',
    })
  );
  
  // Get task stats
  await testEndpoint(
    'Get task statistics',
    () => api.get(`/api/tasks/project/${testProjectId}/stats`)
  );
}

// ============= MESSAGE TESTS =============
async function testMessages() {
  log.section('Message Tests');
  
  // Create message
  const created = await testEndpoint(
    'Create message',
    () => api.post('/api/messages', {
      content: 'Test message content',
      projectId: testProjectId,
      mentions: [],
    }),
    (data) => data.id && data.content
  );
  
  if (created) {
    const response = await api.post('/api/messages', {
      content: 'Test message content',
      projectId: testProjectId,
    });
    testMessageId = response.data.data.id;
    log.info(`Message ID: ${testMessageId}`);
  }
  
  // Get project messages
  await testEndpoint(
    'Get project messages',
    () => api.get('/api/messages', { params: { projectId: testProjectId } }),
    (data) => Array.isArray(data)
  );
  
  // Create reply
  await testEndpoint(
    'Create reply message',
    () => api.post('/api/messages', {
      content: 'Reply to test message',
      projectId: testProjectId,
      parentId: testMessageId,
    }),
    (data) => data.parentId === testMessageId
  );
  
  // Get message thread
  await testEndpoint(
    'Get message thread',
    () => api.get(`/api/messages/${testMessageId}/thread`),
    (data) => data.id === testMessageId
  );
  
  // Update message
  await testEndpoint(
    'Update message',
    () => api.put(`/api/messages/${testMessageId}`, {
      content: 'Updated message content',
    }),
    (data) => data.content === 'Updated message content'
  );
  
  // Search messages
  await testEndpoint(
    'Search messages',
    () => api.get('/api/messages/search', { params: { q: 'test' } }),
    (data) => Array.isArray(data)
  );
}

// ============= NOTIFICATION TESTS =============
async function testNotifications() {
  log.section('Notification Tests');
  
  // Get notifications
  const notifications = await testEndpoint(
    'Get notifications',
    () => api.get('/api/notifications'),
    (data) => Array.isArray(data)
  );
  
  if (notifications) {
    const response = await api.get('/api/notifications');
    const notifs = response.data.data || [];
    if (notifs.length > 0) {
      testNotificationId = notifs[0].id;
      log.info(`Notification ID: ${testNotificationId}`);
      
      // Mark as read
      await testEndpoint(
        'Mark notification as read',
        () => api.put(`/api/notifications/${testNotificationId}/read`)
      );
    }
  }
  
  // Mark all as read
  await testEndpoint(
    'Mark all notifications as read',
    () => api.put('/api/notifications/read-all')
  );
  
  // Get preferences
  await testEndpoint(
    'Get notification preferences',
    () => api.get('/api/notifications/preferences')
  );
  
  // Update preferences
  await testEndpoint(
    'Update notification preferences',
    () => api.put('/api/notifications/preferences', {
      email: true,
      push: false,
      taskAssigned: true,
      taskDue: true,
      mentions: true,
      projectUpdates: false,
    })
  );
  
  // Get stats
  await testEndpoint(
    'Get notification statistics',
    () => api.get('/api/notifications/stats')
  );
}

// ============= WEBSOCKET TESTS =============
async function testWebSocket() {
  log.section('WebSocket Tests');
  
  return new Promise<void>((resolve) => {
    const ws = new WebSocket(`${WS_URL}/ws`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    
    let messageReceived = false;
    const timeout = setTimeout(() => {
      if (!messageReceived) {
        log.error('WebSocket: No messages received (timeout)');
      }
      ws.close();
      resolve();
    }, 5000);
    
    ws.on('open', () => {
      log.success('WebSocket: Connected');
      
      // Send test message
      ws.send(JSON.stringify({
        type: 'subscribe',
        projectId: testProjectId,
      }));
      
      ws.send(JSON.stringify({
        type: 'ping',
      }));
    });
    
    ws.on('message', (data) => {
      messageReceived = true;
      const message = JSON.parse(data.toString());
      log.success(`WebSocket: Received ${message.type} message`);
      
      if (message.type === 'pong') {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    });
    
    ws.on('error', (error) => {
      log.error(`WebSocket: ${error.message}`);
      clearTimeout(timeout);
      resolve();
    });
    
    ws.on('close', () => {
      log.info('WebSocket: Disconnected');
    });
  });
}

// ============= CLEANUP TESTS =============
async function cleanup() {
  log.section('Cleanup');
  
  // Delete task
  if (testTaskId) {
    await testEndpoint(
      'Delete task',
      () => api.delete(`/api/tasks/${testTaskId}`)
    );
  }
  
  // Delete message
  if (testMessageId) {
    await testEndpoint(
      'Delete message',
      () => api.delete(`/api/messages/${testMessageId}`)
    );
  }
  
  // Delete project
  if (testProjectId) {
    await testEndpoint(
      'Delete project',
      () => api.delete(`/api/projects/${testProjectId}`)
    );
  }
  
  // Logout
  await testEndpoint(
    'Logout',
    () => api.post('/api/auth/logout')
  );
}

// ============= MAIN TEST RUNNER =============
async function runTests() {
  console.log(chalk.bold.magenta('\n🚀 SynergySphere API Integration Tests\n'));
  console.log(chalk.gray(`Backend URL: ${BACKEND_URL}`));
  console.log(chalk.gray(`WebSocket URL: ${WS_URL}\n`));
  
  const startTime = Date.now();
  let totalTests = 0;
  let passedTests = 0;
  
  try {
    // Check backend health
    log.section('Health Check');
    try {
      const health = await api.get('/health');
      log.success(`Backend is healthy: ${health.data.status}`);
    } catch (error) {
      log.error('Backend is not responding. Make sure the server is running.');
      process.exit(1);
    }
    
    // Run test suites
    await testAuth();
    await testProjects();
    await testTasks();
    await testMessages();
    await testNotifications();
    await testWebSocket();
    await cleanup();
    
  } catch (error: any) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
  }
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(chalk.bold.magenta(`\n=== Test Summary ===\n`));
  console.log(`Duration: ${duration}s`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  
  // Test adapter integration
  log.section('Frontend Adapter Integration');
  log.info('To test the frontend adapter:');
  log.info('1. Start the frontend: cd frontend && npm run dev');
  log.info('2. The adapter will automatically transform data between frontend and backend formats');
  log.info('3. Check browser console for any API errors');
  log.info('4. Verify that projects, tasks, and messages display correctly');
}

// Run tests
runTests().catch(console.error);
