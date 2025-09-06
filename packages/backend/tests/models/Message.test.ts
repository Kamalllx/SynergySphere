import { MessageModel } from '../../src/models/Message';
import { ProjectModel } from '../../src/models/Project';
import { UserModel } from '../../src/models/User';
import { CreateMessageInput } from '../../src/types/models';
import { testPrisma } from '../setup';

describe('MessageModel', () => {
  let testUser: any;
  let testUser2: any;
  let testProject: any;

  beforeEach(async () => {
    testUser = await UserModel.create({
      email: 'author@example.com',
      name: 'Message Author',
      password: 'password123',
    });

    testUser2 = await UserModel.create({
      email: 'mentioned@example.com',
      name: 'Mentioned User',
      password: 'password123',
    });

    testProject = await ProjectModel.create({
      name: 'Test Project',
      description: 'A test project',
      ownerId: testUser.id,
    });
  });

  const testMessageData: CreateMessageInput = {
    content: 'This is a test message',
    projectId: '', // Will be set in tests
    authorId: '', // Will be set in tests
  };

  describe('create', () => {
    it('should create a new message', async () => {
      const messageData = {
        ...testMessageData,
        projectId: testProject.id,
        authorId: testUser.id,
      };

      const message = await MessageModel.create(messageData);

      expect(message).toBeDefined();
      expect(message.content).toBe(messageData.content);
      expect(message.projectId).toBe(testProject.id);
      expect(message.authorId).toBe(testUser.id);
      expect(message.parentId).toBeNull();
      expect(message.mentions).toEqual([]);
      expect(message.id).toBeDefined();
      expect(message.createdAt).toBeDefined();
    });

    it('should create message with mentions', async () => {
      const messageData = {
        ...testMessageData,
        content: 'Hello @testuser2, this is a message',
        projectId: testProject.id,
        authorId: testUser.id,
        mentions: [testUser2.id],
      };

      const message = await MessageModel.create(messageData);

      expect(message.mentions).toEqual([testUser2.id]);
    });

    it('should create reply message', async () => {
      const parentMessage = await MessageModel.create({
        ...testMessageData,
        projectId: testProject.id,
        authorId: testUser.id,
      });

      const replyData = {
        ...testMessageData,
        content: 'This is a reply',
        projectId: testProject.id,
        authorId: testUser2.id,
        parentId: parentMessage.id,
      };

      const reply = await MessageModel.create(replyData);

      expect(reply.parentId).toBe(parentMessage.id);
      expect(reply.content).toBe(replyData.content);
    });
  });

  describe('findById', () => {
    it('should find message by ID', async () => {
      const messageData = {
        ...testMessageData,
        projectId: testProject.id,
        authorId: testUser.id,
      };
      const createdMessage = await MessageModel.create(messageData);
      const foundMessage = await MessageModel.findById(createdMessage.id);

      expect(foundMessage).toBeDefined();
      expect(foundMessage?.id).toBe(createdMessage.id);
      expect(foundMessage?.content).toBe(createdMessage.content);
    });

    it('should return null for non-existent ID', async () => {
      const foundMessage = await MessageModel.findById('non-existent-id');
      expect(foundMessage).toBeNull();
    });
  });

  describe('findByIdWithRelations', () => {
    it('should find message with author and replies', async () => {
      const parentMessage = await MessageModel.create({
        ...testMessageData,
        projectId: testProject.id,
        authorId: testUser.id,
      });

      const reply = await MessageModel.create({
        ...testMessageData,
        content: 'This is a reply',
        projectId: testProject.id,
        authorId: testUser2.id,
        parentId: parentMessage.id,
      });

      const messageWithRelations = await MessageModel.findByIdWithRelations(parentMessage.id);

      expect(messageWithRelations).toBeDefined();
      expect(messageWithRelations?.author).toBeDefined();
      expect(messageWithRelations?.author?.id).toBe(testUser.id);
      expect(messageWithRelations?.replies).toBeDefined();
      expect(messageWithRelations?.replies).toHaveLength(1);
      expect(messageWithRelations?.replies?.[0].id).toBe(reply.id);
    });

    it('should find reply with parent message', async () => {
      const parentMessage = await MessageModel.create({
        ...testMessageData,
        projectId: testProject.id,
        authorId: testUser.id,
      });

      const reply = await MessageModel.create({
        ...testMessageData,
        content: 'This is a reply',
        projectId: testProject.id,
        authorId: testUser2.id,
        parentId: parentMessage.id,
      });

      const replyWithRelations = await MessageModel.findByIdWithRelations(reply.id);

      expect(replyWithRelations?.parent).toBeDefined();
      expect(replyWithRelations?.parent?.id).toBe(parentMessage.id);
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      // Create messages in different projects
      await MessageModel.create({
        ...testMessageData,
        content: 'Message 1',
        projectId: testProject.id,
        authorId: testUser.id,
      });

      await MessageModel.create({
        ...testMessageData,
        content: 'Message 2',
        projectId: testProject.id,
        authorId: testUser2.id,
      });

      // Create another project and message
      const anotherProject = await ProjectModel.create({
        name: 'Another Project',
        ownerId: testUser2.id,
      });

      await MessageModel.create({
        ...testMessageData,
        content: 'Message in another project',
        projectId: anotherProject.id,
        authorId: testUser2.id,
      });
    });

    it('should find all messages without filters', async () => {
      const messages = await MessageModel.findMany();
      expect(messages).toHaveLength(3);
    });

    it('should filter messages by project', async () => {
      const messages = await MessageModel.findMany({ projectId: testProject.id });
      expect(messages).toHaveLength(2);
      expect(messages.every(m => m.projectId === testProject.id)).toBe(true);
    });

    it('should filter messages by author', async () => {
      const messages = await MessageModel.findMany({ authorId: testUser.id });
      expect(messages).toHaveLength(1);
      expect(messages[0].authorId).toBe(testUser.id);
    });

    it('should support pagination', async () => {
      const page1 = await MessageModel.findMany({}, 1, 2);
      expect(page1).toHaveLength(2);

      const page2 = await MessageModel.findMany({}, 2, 2);
      expect(page2).toHaveLength(1);
    });
  });

  describe('findProjectMessages', () => {
    beforeEach(async () => {
      const parentMessage = await MessageModel.create({
        ...testMessageData,
        content: 'Parent message',
        projectId: testProject.id,
        authorId: testUser.id,
      });

      // Create reply (should not be included in project messages)
      await MessageModel.create({
        ...testMessageData,
        content: 'Reply message',
        projectId: testProject.id,
        authorId: testUser2.id,
        parentId: parentMessage.id,
      });

      // Create another top-level message
      await MessageModel.create({
        ...testMessageData,
        content: 'Another parent message',
        projectId: testProject.id,
        authorId: testUser.id,
      });
    });

    it('should find only top-level project messages', async () => {
      const messages = await MessageModel.findProjectMessages(testProject.id);
      expect(messages).toHaveLength(2);
      expect(messages.every(m => m.parentId === null)).toBe(true);
    });
  });

  describe('findReplies', () => {
    it('should find replies to a message', async () => {
      const parentMessage = await MessageModel.create({
        ...testMessageData,
        projectId: testProject.id,
        authorId: testUser.id,
      });

      const reply1 = await MessageModel.create({
        ...testMessageData,
        content: 'Reply 1',
        projectId: testProject.id,
        authorId: testUser2.id,
        parentId: parentMessage.id,
      });

      const reply2 = await MessageModel.create({
        ...testMessageData,
        content: 'Reply 2',
        projectId: testProject.id,
        authorId: testUser.id,
        parentId: parentMessage.id,
      });

      const replies = await MessageModel.findReplies(parentMessage.id);
      expect(replies).toHaveLength(2);
      expect(replies.map(r => r.id)).toContain(reply1.id);
      expect(replies.map(r => r.id)).toContain(reply2.id);
    });
  });

  describe('update', () => {
    it('should update message content and set editedAt', async () => {
      const messageData = {
        ...testMessageData,
        projectId: testProject.id,
        authorId: testUser.id,
      };
      const createdMessage = await MessageModel.create(messageData);
      expect(createdMessage.editedAt).toBeNull();

      const updateData = {
        content: 'Updated message content',
        mentions: [testUser2.id],
      };

      const updatedMessage = await MessageModel.update(createdMessage.id, updateData);

      expect(updatedMessage.content).toBe(updateData.content);
      expect(updatedMessage.mentions).toEqual(updateData.mentions);
      expect(updatedMessage.editedAt).toBeDefined();
      expect(updatedMessage.editedAt).toBeInstanceOf(Date);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await MessageModel.create({
        ...testMessageData,
        content: 'This message contains the word important',
        projectId: testProject.id,
        authorId: testUser.id,
      });

      await MessageModel.create({
        ...testMessageData,
        content: 'This is just a regular message',
        projectId: testProject.id,
        authorId: testUser2.id,
      });

      await MessageModel.create({
        ...testMessageData,
        content: 'Another important update here',
        projectId: testProject.id,
        authorId: testUser.id,
      });
    });

    it('should search messages by content', async () => {
      const results = await MessageModel.search(testProject.id, 'important');
      expect(results).toHaveLength(2);
      expect(results.every(m => m.content.toLowerCase().includes('important'))).toBe(true);
    });

    it('should be case insensitive', async () => {
      const results = await MessageModel.search(testProject.id, 'IMPORTANT');
      expect(results).toHaveLength(2);
    });
  });

  describe('findMentions', () => {
    beforeEach(async () => {
      await MessageModel.create({
        ...testMessageData,
        content: 'Hello @testuser2',
        projectId: testProject.id,
        authorId: testUser.id,
        mentions: [testUser2.id],
      });

      await MessageModel.create({
        ...testMessageData,
        content: 'Another message mentioning @testuser2',
        projectId: testProject.id,
        authorId: testUser.id,
        mentions: [testUser2.id],
      });

      await MessageModel.create({
        ...testMessageData,
        content: 'Message without mentions',
        projectId: testProject.id,
        authorId: testUser.id,
      });
    });

    it('should find messages mentioning a user', async () => {
      const mentions = await MessageModel.findMentions(testUser2.id);
      expect(mentions).toHaveLength(2);
      expect(mentions.every(m => m.mentions.includes(testUser2.id))).toBe(true);
    });
  });

  describe('extractMentions', () => {
    it('should extract mentions from message content', async () => {
      const content = 'Hello @john and @jane, how are you @john?';
      const mentions = MessageModel.extractMentions(content);
      
      expect(mentions).toEqual(['john', 'jane']); // Should remove duplicates
    });

    it('should return empty array for no mentions', async () => {
      const content = 'Hello everyone, no mentions here';
      const mentions = MessageModel.extractMentions(content);
      
      expect(mentions).toEqual([]);
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      await MessageModel.create({
        ...testMessageData,
        content: 'Message 1',
        projectId: testProject.id,
        authorId: testUser.id,
      });

      await MessageModel.create({
        ...testMessageData,
        content: 'Message 2',
        projectId: testProject.id,
        authorId: testUser2.id,
      });

      await MessageModel.create({
        ...testMessageData,
        content: 'Message 3',
        projectId: testProject.id,
        authorId: testUser.id,
      });
    });

    describe('getProjectMessageCount', () => {
      it('should return message count for project', async () => {
        const count = await MessageModel.getProjectMessageCount(testProject.id);
        expect(count).toBe(3);
      });
    });

    describe('getRecentMessages', () => {
      it('should return recent messages for project', async () => {
        const recentMessages = await MessageModel.getRecentMessages(testProject.id, 2);
        expect(recentMessages).toHaveLength(2);
        // Should be ordered by createdAt desc
        expect(recentMessages[0].createdAt.getTime()).toBeGreaterThanOrEqual(
          recentMessages[1].createdAt.getTime()
        );
      });
    });

    describe('getProjectStatistics', () => {
      it('should return project message statistics', async () => {
        const stats = await MessageModel.getProjectStatistics(testProject.id);

        expect(stats.total).toBe(3);
        expect(stats.uniqueAuthors).toBe(2); // testUser and testUser2
        expect(stats.recentActivity).toBe(3); // All messages are recent
      });
    });
  });

  describe('delete', () => {
    it('should delete message', async () => {
      const messageData = {
        ...testMessageData,
        projectId: testProject.id,
        authorId: testUser.id,
      };
      const message = await MessageModel.create(messageData);
      
      const deletedMessage = await MessageModel.delete(message.id);
      expect(deletedMessage.id).toBe(message.id);

      const foundMessage = await MessageModel.findById(message.id);
      expect(foundMessage).toBeNull();
    });

    it('should cascade delete replies when parent is deleted', async () => {
      const parentMessage = await MessageModel.create({
        ...testMessageData,
        projectId: testProject.id,
        authorId: testUser.id,
      });

      const reply = await MessageModel.create({
        ...testMessageData,
        content: 'Reply',
        projectId: testProject.id,
        authorId: testUser2.id,
        parentId: parentMessage.id,
      });

      await MessageModel.delete(parentMessage.id);

      const foundReply = await MessageModel.findById(reply.id);
      expect(foundReply).toBeNull(); // Should be cascade deleted
    });
  });
});