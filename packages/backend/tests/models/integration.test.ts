import { UserModel, ProjectModel, TaskModel, MessageModel, NotificationModel } from '../../src/models';
import { prisma } from '../../src/config/database';

describe('Database Models Integration', () => {
  describe('Model Exports', () => {
    it('should export all model classes', () => {
      expect(UserModel).toBeDefined();
      expect(ProjectModel).toBeDefined();
      expect(TaskModel).toBeDefined();
      expect(MessageModel).toBeDefined();
      expect(NotificationModel).toBeDefined();
    });

    it('should have all required methods on UserModel', () => {
      expect(typeof UserModel.create).toBe('function');
      expect(typeof UserModel.findById).toBe('function');
      expect(typeof UserModel.findByEmail).toBe('function');
      expect(typeof UserModel.findByIdWithRelations).toBe('function');
      expect(typeof UserModel.findMany).toBe('function');
      expect(typeof UserModel.update).toBe('function');
      expect(typeof UserModel.updateLastLogin).toBe('function');
      expect(typeof UserModel.verifyPassword).toBe('function');
      expect(typeof UserModel.updatePassword).toBe('function');
      expect(typeof UserModel.delete).toBe('function');
      expect(typeof UserModel.emailExists).toBe('function');
      expect(typeof UserModel.count).toBe('function');
    });

    it('should have all required methods on ProjectModel', () => {
      expect(typeof ProjectModel.create).toBe('function');
      expect(typeof ProjectModel.findById).toBe('function');
      expect(typeof ProjectModel.findByIdWithRelations).toBe('function');
      expect(typeof ProjectModel.findByUserId).toBe('function');
      expect(typeof ProjectModel.update).toBe('function');
      expect(typeof ProjectModel.delete).toBe('function');
      expect(typeof ProjectModel.addMember).toBe('function');
      expect(typeof ProjectModel.removeMember).toBe('function');
      expect(typeof ProjectModel.updateMemberRole).toBe('function');
      expect(typeof ProjectModel.isMember).toBe('function');
      expect(typeof ProjectModel.getUserRole).toBe('function');
      expect(typeof ProjectModel.getStatistics).toBe('function');
    });

    it('should have all required methods on TaskModel', () => {
      expect(typeof TaskModel.create).toBe('function');
      expect(typeof TaskModel.findById).toBe('function');
      expect(typeof TaskModel.findByIdWithRelations).toBe('function');
      expect(typeof TaskModel.findMany).toBe('function');
      expect(typeof TaskModel.update).toBe('function');
      expect(typeof TaskModel.updateStatus).toBe('function');
      expect(typeof TaskModel.assign).toBe('function');
      expect(typeof TaskModel.unassign).toBe('function');
      expect(typeof TaskModel.delete).toBe('function');
      expect(typeof TaskModel.getOverdueTasks).toBe('function');
      expect(typeof TaskModel.getTasksDueSoon).toBe('function');
      expect(typeof TaskModel.getProjectStatistics).toBe('function');
      expect(typeof TaskModel.getUserStatistics).toBe('function');
    });

    it('should have all required methods on MessageModel', () => {
      expect(typeof MessageModel.create).toBe('function');
      expect(typeof MessageModel.findById).toBe('function');
      expect(typeof MessageModel.findByIdWithRelations).toBe('function');
      expect(typeof MessageModel.findMany).toBe('function');
      expect(typeof MessageModel.findProjectMessages).toBe('function');
      expect(typeof MessageModel.findReplies).toBe('function');
      expect(typeof MessageModel.update).toBe('function');
      expect(typeof MessageModel.delete).toBe('function');
      expect(typeof MessageModel.search).toBe('function');
      expect(typeof MessageModel.findMentions).toBe('function');
      expect(typeof MessageModel.getProjectMessageCount).toBe('function');
      expect(typeof MessageModel.getRecentMessages).toBe('function');
      expect(typeof MessageModel.extractMentions).toBe('function');
      expect(typeof MessageModel.getProjectStatistics).toBe('function');
    });

    it('should have all required methods on NotificationModel', () => {
      expect(typeof NotificationModel.create).toBe('function');
      expect(typeof NotificationModel.createMany).toBe('function');
      expect(typeof NotificationModel.findById).toBe('function');
      expect(typeof NotificationModel.findMany).toBe('function');
      expect(typeof NotificationModel.findUserNotifications).toBe('function');
      expect(typeof NotificationModel.findUnreadNotifications).toBe('function');
      expect(typeof NotificationModel.markAsRead).toBe('function');
      expect(typeof NotificationModel.markManyAsRead).toBe('function');
      expect(typeof NotificationModel.markAllAsRead).toBe('function');
      expect(typeof NotificationModel.delete).toBe('function');
      expect(typeof NotificationModel.deleteMany).toBe('function');
      expect(typeof NotificationModel.deleteOldNotifications).toBe('function');
      expect(typeof NotificationModel.getUnreadCount).toBe('function');
      expect(typeof NotificationModel.getUserStatistics).toBe('function');
      expect(typeof NotificationModel.createTaskAssignmentNotification).toBe('function');
      expect(typeof NotificationModel.createTaskDueNotification).toBe('function');
      expect(typeof NotificationModel.createMentionNotification).toBe('function');
      expect(typeof NotificationModel.createProjectUpdateNotification).toBe('function');
      expect(typeof NotificationModel.notifyProjectMembers).toBe('function');
    });
  });

  describe('Database Connection', () => {
    it('should have prisma client available', () => {
      expect(prisma).toBeDefined();
      expect(typeof prisma.$connect).toBe('function');
      expect(typeof prisma.$disconnect).toBe('function');
    });
  });

  describe('Message Model Utilities', () => {
    it('should extract mentions from message content', () => {
      const content = 'Hello @john and @jane, please review this task @admin';
      const mentions = MessageModel.extractMentions(content);
      
      expect(mentions).toEqual(['john', 'jane', 'admin']);
    });

    it('should handle content with no mentions', () => {
      const content = 'This is a regular message without any mentions';
      const mentions = MessageModel.extractMentions(content);
      
      expect(mentions).toEqual([]);
    });

    it('should handle duplicate mentions', () => {
      const content = 'Hello @john, @john please check this @john';
      const mentions = MessageModel.extractMentions(content);
      
      expect(mentions).toEqual(['john']);
    });
  });
});