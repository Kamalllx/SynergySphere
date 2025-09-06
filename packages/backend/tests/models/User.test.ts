import { UserModel } from '../../src/models/User';
import { CreateUserInput, UpdateUserInput } from '../../src/types/models';
import { testPrisma } from '../setup';

describe('UserModel', () => {
  const testUserData: CreateUserInput = {
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123',
  };

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const user = await UserModel.create(testUserData);

      expect(user).toBeDefined();
      expect(user.email).toBe(testUserData.email);
      expect(user.name).toBe(testUserData.name);
      expect(user.password).not.toBe(testUserData.password); // Should be hashed
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should set default notification preferences', async () => {
      const user = await UserModel.create(testUserData);

      expect(user.emailNotifications).toBe(true);
      expect(user.pushNotifications).toBe(true);
      expect(user.taskAssignments).toBe(true);
      expect(user.projectUpdates).toBe(true);
      expect(user.mentions).toBe(true);
    });

    it('should throw error for duplicate email', async () => {
      await UserModel.create(testUserData);

      await expect(UserModel.create(testUserData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const createdUser = await UserModel.create(testUserData);
      const foundUser = await UserModel.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(createdUser.email);
    });

    it('should return null for non-existent ID', async () => {
      const foundUser = await UserModel.findById('non-existent-id');
      expect(foundUser).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const createdUser = await UserModel.create(testUserData);
      const foundUser = await UserModel.findByEmail(testUserData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(testUserData.email);
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await UserModel.findByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('findByIdWithRelations', () => {
    it('should find user with relations', async () => {
      const createdUser = await UserModel.create(testUserData);
      const userWithRelations = await UserModel.findByIdWithRelations(createdUser.id);

      expect(userWithRelations).toBeDefined();
      expect(userWithRelations?.ownedProjects).toBeDefined();
      expect(userWithRelations?.projectMembers).toBeDefined();
      expect(userWithRelations?.createdTasks).toBeDefined();
      expect(userWithRelations?.assignedTasks).toBeDefined();
      expect(userWithRelations?.notifications).toBeDefined();
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      await UserModel.create({ ...testUserData, email: 'user1@example.com', name: 'User One' });
      await UserModel.create({ ...testUserData, email: 'user2@example.com', name: 'User Two' });
      await UserModel.create({ ...testUserData, email: 'admin@example.com', name: 'Admin User' });
    });

    it('should find all users without filters', async () => {
      const users = await UserModel.findMany();
      expect(users).toHaveLength(3);
    });

    it('should filter users by email', async () => {
      const users = await UserModel.findMany({ email: 'user1' });
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('user1@example.com');
    });

    it('should filter users by name', async () => {
      const users = await UserModel.findMany({ name: 'Admin' });
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('Admin User');
    });
  });

  describe('update', () => {
    it('should update user data', async () => {
      const createdUser = await UserModel.create(testUserData);
      const updateData: UpdateUserInput = {
        name: 'Updated Name',
        emailNotifications: false,
      };

      const updatedUser = await UserModel.update(createdUser.id, updateData);

      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.emailNotifications).toBe(false);
      expect(updatedUser.email).toBe(testUserData.email); // Should remain unchanged
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const createdUser = await UserModel.create(testUserData);
      expect(createdUser.lastLoginAt).toBeNull();

      const updatedUser = await UserModel.updateLastLogin(createdUser.id);
      expect(updatedUser.lastLoginAt).toBeDefined();
      expect(updatedUser.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const user = await UserModel.create(testUserData);
      const isValid = await UserModel.verifyPassword(user, testUserData.password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const user = await UserModel.create(testUserData);
      const isValid = await UserModel.verifyPassword(user, 'wrongpassword');
      expect(isValid).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update password with hashing', async () => {
      const user = await UserModel.create(testUserData);
      const newPassword = 'newpassword123';
      
      const updatedUser = await UserModel.updatePassword(user.id, newPassword);
      
      expect(updatedUser.password).not.toBe(newPassword); // Should be hashed
      expect(updatedUser.password).not.toBe(user.password); // Should be different from old password
      
      // Verify new password works
      const isValid = await UserModel.verifyPassword(updatedUser, newPassword);
      expect(isValid).toBe(true);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      await UserModel.create(testUserData);
      const exists = await UserModel.emailExists(testUserData.email);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing email', async () => {
      const exists = await UserModel.emailExists('nonexistent@example.com');
      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await UserModel.create({ ...testUserData, email: 'user1@example.com' });
      await UserModel.create({ ...testUserData, email: 'user2@example.com' });
    });

    it('should count all users', async () => {
      const count = await UserModel.count();
      expect(count).toBe(2);
    });

    it('should count users with filters', async () => {
      const count = await UserModel.count({ email: 'user1' });
      expect(count).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const user = await UserModel.create(testUserData);
      
      const deletedUser = await UserModel.delete(user.id);
      expect(deletedUser.id).toBe(user.id);
      
      const foundUser = await UserModel.findById(user.id);
      expect(foundUser).toBeNull();
    });
  });
});