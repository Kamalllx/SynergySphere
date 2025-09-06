import { ProjectModel } from '../../src/models/Project';
import { UserModel } from '../../src/models/User';
import { CreateProjectInput, ProjectMemberRole } from '../../src/types/models';
import { testPrisma } from '../setup';

describe('ProjectModel', () => {
  let testUser: any;
  let testUser2: any;

  beforeEach(async () => {
    testUser = await UserModel.create({
      email: 'owner@example.com',
      name: 'Project Owner',
      password: 'password123',
    });

    testUser2 = await UserModel.create({
      email: 'member@example.com',
      name: 'Project Member',
      password: 'password123',
    });
  });

  const testProjectData: CreateProjectInput = {
    name: 'Test Project',
    description: 'A test project',
    ownerId: '', // Will be set in tests
  };

  describe('create', () => {
    it('should create a new project and add owner as member', async () => {
      const projectData = { ...testProjectData, ownerId: testUser.id };
      const project = await ProjectModel.create(projectData);

      expect(project).toBeDefined();
      expect(project.name).toBe(projectData.name);
      expect(project.description).toBe(projectData.description);
      expect(project.ownerId).toBe(testUser.id);
      expect(project.id).toBeDefined();
      expect(project.createdAt).toBeDefined();

      // Verify owner is added as member
      const isMember = await ProjectModel.isMember(project.id, testUser.id);
      expect(isMember).toBe(true);

      const role = await ProjectModel.getUserRole(project.id, testUser.id);
      expect(role).toBe(ProjectMemberRole.OWNER);
    });

    it('should set default project settings', async () => {
      const projectData = { ...testProjectData, ownerId: testUser.id };
      const project = await ProjectModel.create(projectData);

      expect(project.isPublic).toBe(false);
      expect(project.allowMemberInvites).toBe(true);
    });
  });

  describe('findById', () => {
    it('should find project by ID', async () => {
      const projectData = { ...testProjectData, ownerId: testUser.id };
      const createdProject = await ProjectModel.create(projectData);
      const foundProject = await ProjectModel.findById(createdProject.id);

      expect(foundProject).toBeDefined();
      expect(foundProject?.id).toBe(createdProject.id);
      expect(foundProject?.name).toBe(createdProject.name);
    });

    it('should return null for non-existent ID', async () => {
      const foundProject = await ProjectModel.findById('non-existent-id');
      expect(foundProject).toBeNull();
    });
  });

  describe('findByIdWithRelations', () => {
    it('should find project with all relations', async () => {
      const projectData = { ...testProjectData, ownerId: testUser.id };
      const createdProject = await ProjectModel.create(projectData);
      
      const projectWithRelations = await ProjectModel.findByIdWithRelations(createdProject.id);

      expect(projectWithRelations).toBeDefined();
      expect(projectWithRelations?.owner).toBeDefined();
      expect(projectWithRelations?.owner?.id).toBe(testUser.id);
      expect(projectWithRelations?.members).toBeDefined();
      expect(projectWithRelations?.members).toHaveLength(1);
      expect(projectWithRelations?.tasks).toBeDefined();
      expect(projectWithRelations?.messages).toBeDefined();
    });
  });

  describe('findByUserId', () => {
    beforeEach(async () => {
      // Create projects for testUser
      await ProjectModel.create({ ...testProjectData, name: 'Project 1', ownerId: testUser.id });
      await ProjectModel.create({ ...testProjectData, name: 'Project 2', ownerId: testUser.id });
      
      // Create project for testUser2
      await ProjectModel.create({ ...testProjectData, name: 'Other Project', ownerId: testUser2.id });
    });

    it('should find projects for user', async () => {
      const projects = await ProjectModel.findByUserId(testUser.id);
      expect(projects).toHaveLength(2);
      expect(projects.every(p => p.ownerId === testUser.id)).toBe(true);
    });

    it('should filter projects by search term', async () => {
      const projects = await ProjectModel.findByUserId(testUser.id, { search: 'Project 1' });
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Project 1');
    });

    it('should return empty array for user with no projects', async () => {
      const newUser = await UserModel.create({
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
      });

      const projects = await ProjectModel.findByUserId(newUser.id);
      expect(projects).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update project data', async () => {
      const projectData = { ...testProjectData, ownerId: testUser.id };
      const createdProject = await ProjectModel.create(projectData);
      
      const updateData = {
        name: 'Updated Project Name',
        isPublic: true,
      };

      const updatedProject = await ProjectModel.update(createdProject.id, updateData);

      expect(updatedProject.name).toBe(updateData.name);
      expect(updatedProject.isPublic).toBe(true);
      expect(updatedProject.description).toBe(projectData.description); // Should remain unchanged
    });
  });

  describe('member management', () => {
    let project: any;

    beforeEach(async () => {
      const projectData = { ...testProjectData, ownerId: testUser.id };
      project = await ProjectModel.create(projectData);
    });

    describe('addMember', () => {
      it('should add member to project', async () => {
        const member = await ProjectModel.addMember(project.id, testUser2.id);

        expect(member).toBeDefined();
        expect(member.userId).toBe(testUser2.id);
        expect(member.projectId).toBe(project.id);
        expect(member.role).toBe(ProjectMemberRole.MEMBER);

        const isMember = await ProjectModel.isMember(project.id, testUser2.id);
        expect(isMember).toBe(true);
      });

      it('should add member with specific role', async () => {
        const member = await ProjectModel.addMember(project.id, testUser2.id, ProjectMemberRole.ADMIN);

        expect(member.role).toBe(ProjectMemberRole.ADMIN);

        const role = await ProjectModel.getUserRole(project.id, testUser2.id);
        expect(role).toBe(ProjectMemberRole.ADMIN);
      });
    });

    describe('removeMember', () => {
      beforeEach(async () => {
        await ProjectModel.addMember(project.id, testUser2.id);
      });

      it('should remove member from project', async () => {
        const removedMember = await ProjectModel.removeMember(project.id, testUser2.id);

        expect(removedMember.userId).toBe(testUser2.id);
        expect(removedMember.projectId).toBe(project.id);

        const isMember = await ProjectModel.isMember(project.id, testUser2.id);
        expect(isMember).toBe(false);
      });
    });

    describe('updateMemberRole', () => {
      beforeEach(async () => {
        await ProjectModel.addMember(project.id, testUser2.id);
      });

      it('should update member role', async () => {
        const updatedMember = await ProjectModel.updateMemberRole(
          project.id,
          testUser2.id,
          ProjectMemberRole.ADMIN
        );

        expect(updatedMember.role).toBe(ProjectMemberRole.ADMIN);

        const role = await ProjectModel.getUserRole(project.id, testUser2.id);
        expect(role).toBe(ProjectMemberRole.ADMIN);
      });
    });

    describe('isMember', () => {
      it('should return true for project member', async () => {
        const isMember = await ProjectModel.isMember(project.id, testUser.id);
        expect(isMember).toBe(true);
      });

      it('should return false for non-member', async () => {
        const isMember = await ProjectModel.isMember(project.id, testUser2.id);
        expect(isMember).toBe(false);
      });
    });

    describe('getUserRole', () => {
      it('should return user role in project', async () => {
        const role = await ProjectModel.getUserRole(project.id, testUser.id);
        expect(role).toBe(ProjectMemberRole.OWNER);
      });

      it('should return null for non-member', async () => {
        const role = await ProjectModel.getUserRole(project.id, testUser2.id);
        expect(role).toBeNull();
      });
    });
  });

  describe('getStatistics', () => {
    it('should return project statistics', async () => {
      const projectData = { ...testProjectData, ownerId: testUser.id };
      const project = await ProjectModel.create(projectData);

      const stats = await ProjectModel.getStatistics(project.id);

      expect(stats).toBeDefined();
      expect(stats.tasks).toBeDefined();
      expect(stats.tasks.total).toBe(0);
      expect(stats.tasks.todo).toBe(0);
      expect(stats.tasks.inProgress).toBe(0);
      expect(stats.tasks.done).toBe(0);
      expect(stats.members).toBe(1); // Owner is automatically added
      expect(stats.messages).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete project and cascade to members', async () => {
      const projectData = { ...testProjectData, ownerId: testUser.id };
      const project = await ProjectModel.create(projectData);
      
      await ProjectModel.addMember(project.id, testUser2.id);

      const deletedProject = await ProjectModel.delete(project.id);
      expect(deletedProject.id).toBe(project.id);

      const foundProject = await ProjectModel.findById(project.id);
      expect(foundProject).toBeNull();

      // Verify members are also deleted
      const isMember = await ProjectModel.isMember(project.id, testUser.id);
      expect(isMember).toBe(false);
    });
  });
});