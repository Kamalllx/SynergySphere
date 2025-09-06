import { NotificationModel } from '../../src/models/Notification';
import { ProjectModel } from '../../src/models/Project';
import { UserModel } from '../../src/models/User';
import { CreateNotificationInput, NotificationType } from '../../src/types/models';
import { testPrisma } from '../setup';

describe('NotificationModel', () => {
  let testUser: any;
  let testUser2: any;
  let testUser3: any;
  let testProject: any;

  beforeEach(async () => {
    testUser = await UserModel.create({
      email: 'user1@example.com',
      name: 'User One',
      password: 'password123',
    });

    testUser2 = await UserModel.create({
      email: 'user2@example.com',
      name: 'User Two',
      password: 'password123',
    });

    testUser3 = await UserModel.create({
      email: 'user3@example.com',
      name: 'User Three',
      password: 'password123',
    });

    testProject = await ProjectModel.create({
      name: 'Test Project',
      description: 'A test project',
      ownerId: testUser.id,
    });

    // Add users as project members
    await ProjectModel.addMember(testProject.id, testUser2.id);
    await ProjectModel.addMember(testProject.id, testUser3.id);
  });

  const testNotificationData: CreateNotificationInput = {
    userId: '', // Will be set in tests
    type: NotificationType.TASK_ASSIGNED,
    title: 'Test Notification',
    message: 'This is a test notification',
  };

  describe('create', () => {
    it('should create a new notification', async () => {
      const notificationData = {
        ...testNotificationData,
        userId: testUser.id,
      };

      const notification = await NotificationModel.create(notificationData);

      expect(notification).toBeDefined();
      expect(notification.userId).toBe(testUser.id);
      expect(notification.type).toBe(NotificationType.TASK_ASSIGNED);
      expect(notification.title).toBe(notificationData.title);
      expect(notification.message).toBe(notificationData.message);
      expect(notification.isRead).toBe(false);
      expect(notification.data).toEqual({});
      expect(notification.id).toBeDefined();
      expect(notification.createdAt).toBeDefined();
    });

    it('should create notification with custom data', async () => {
      const notificationData = {
        ...testNotificationData,
        userId: testUser.id,
        data: {
          taskId: 'task-123',
          projectId: testProject.id,
        },
      };

      const notification = await NotificationModel.create(notificationData);

      expect(notification.data).toEqual(notificationData.data);
    });
  });

  describe('createMany', () => {
    it('should create multiple notifications', async () => {
      const notifications = [
        { ...testNotificationData, userId: testUser.id },
        { ...testNotificationData, userId: testUser2.id },
        { ...testNotificationData, userId: testUser3.id },
      ];

      const result = await NotificationModel.createMany(notifications);

      expect(result.count).toBe(3);

      const allNotifications = await NotificationModel.findMany();
      expect(allNotifications).toHaveLength(3);
    });
  });

  describe('findById', () => {
    it('should find notification by ID', async () => {
      const notificationData = {
        ...testNotificationData,
        userId: testUser.id,
      };
      const createdNotification = await NotificationModel.create(notificationData);
      const foundNotification = await NotificationModel.findById(createdNotification.id);

      expect(foundNotification).toBeDefined();
      expect(foundNotification?.id).toBe(createdNotification.id);
      expect(foundNotification?.title).toBe(createdNotification.title);
    });

    it('should return null for non-existent ID', async () => {
      const foundNotification = await NotificationModel.findById('non-existent-id');
      expect(foundNotification).toBeNull();
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      // Create notifications for different users and types
      await NotificationModel.create({
        ...testNotificationData,
        userId: testUser.id,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task Assignment',
      });

      await NotificationModel.create({
        ...testNotificationData,
        userId: testUser.id,
        type: NotificationType.MENTION,
        title: 'Mention Notification',
        isRead: true,
      });

      await NotificationModel.create({
        ...testNotificationData,
        userId: testUser2.id,
        type: NotificationType.TASK_DUE,
        title: 'Task Due',
      });
    });

    it('should find all notifications without filters', async () => {
      const notifications = await NotificationModel.findMany();
      expect(notifications).toHaveLength(3);
    });

    it('should filter notifications by user', async () => {
      const notifications = await NotificationModel.findMany({ userId: testUser.id });
      expect(notifications).toHaveLength(2);
      expect(notifications.every(n => n.userId === testUser.id)).toBe(true);
    });

    it('should filter notifications by type', async () => {
      const notifications = await NotificationModel.findMany({ type: NotificationType.TASK_ASSIGNED });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe(NotificationType.TASK_ASSIGNED);
    });

    it('should filter notifications by read status', async () => {
      const unreadNotifications = await NotificationModel.findMany({ isRead: false });
      expect(unreadNotifications).toHaveLength(2);

      const readNotifications = await NotificationModel.findMany({ isRead: true });
      expect(readNotifications).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const page1 = await NotificationModel.findMany({}, 1, 2);
      expect(page1).toHaveLength(2);

      const page2 = await NotificationModel.findMany({}, 2, 2);
      expect(page2).toHaveLength(1);
    });
  });

  describe('findUserNotifications', () => {
    beforeEach(async () => {
      await NotificationModel.create({ ...testNotificationData, userId: testUser.id });
      await NotificationModel.create({ ...testNotificationData, userId: testUser.id });
      await NotificationModel.create({ ...testNotificationData, userId: testUser2.id });
    });

    it('should find notifications for specific user', async () => {
      const notifications = await NotificationModel.findUserNotifications(testUser.id);
      expect(notifications).toHaveLength(2);
      expect(notifications.every(n => n.userId === testUser.id)).toBe(true);
    });
  });

  describe('findUnreadNotifications', () => {
    beforeEach(async () => {
      await NotificationModel.create({ ...testNotificationData, userId: testUser.id });
      
      const readNotification = await NotificationModel.create({ ...testNotificationData, userId: testUser.id });
      await NotificationModel.markAsRead(readNotification.id);
      
      await NotificationModel.create({ ...testNotificationData, userId: testUser2.id });
    });

    it(