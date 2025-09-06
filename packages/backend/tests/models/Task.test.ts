import { TaskModel } from '../../src/models/Task';
import { ProjectModel } from '../../src/models/Project';
import { UserModel } from '../../src/models/User';
import { CreateTaskInput, TaskStatus, TaskPriority } from '../../src/types/models';
import { testPrisma } from '../setup';

describe('TaskModel', () => {
  let testUser: any;
  let testUser2: any;
  let testProject: any;

  beforeEach(async () => {
    testUser = await UserModel.create({
      email: 'creator@example.com',
      name: 'Task Creator',
      password: 'password123',
    });

    testUser2 = await UserModel.create({
      email: 'assignee@example.com',
      name: 'Task Assignee',
      password: 'password123',
    });

    testProject = await ProjectModel.create({
      name: 'Test Project',
      description: 'A test project',
      ownerId: testUser.id,
    });
  });

  const testTaskData: CreateTaskInput = {
    title: 'Test Task',
    description: 'A test task',
    projectId: '', // Will be set in tests
    creatorId: '', // Will be set in tests
  };

  describe('create', () => {
    it('should create a new task', async () => {
      const taskData = {
        ...testTaskData,
        projectId: testProject.id,
        creatorId: testUser.id,
      };

      const task = await TaskModel.create(taskData);

      expect(task).toBeDefined();
      expect(task.title).toBe(taskData.title);
      expect(task.description).toBe(taskData.description);
      expect(task.projectId).toBe(testProject.id);
      expect(task.creatorId).toBe(testUser.id);
      expect(task.status).toBe(TaskStatus.TODO); // Default status
      expect(task.priority).toBe(TaskPriority.MEDIUM); // Default priority
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
    });

    it('should create task with custom status and priority', async () => {
      const taskData = {
        ...testTaskData,
        projectId: testProject.id,
        creatorId: testUser.id,
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assigneeId: testUser2.id,
      };

      const task = await TaskModel.create(taskData);

      expect(task.status).toBe(TaskStatus.IN_PROGRESS);
      expect(task.priority).toBe(TaskPriority.HIGH);
      expect(task.assigneeId).toBe(testUser2.id);
    });

    it('should create task with due date', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const taskData = {
        ...testTaskData,
        projectId: testProject.id,
        creatorId: testUser.id,
        dueDate,
      };

      const task = await TaskModel.create(taskData);

      expect(task.dueDate).toEqual(dueDate);
    });
  });

  describe('findById', () => {
    it('should find task by ID', async () => {
      const taskData = {
        ...testTaskData,
        projectId: testProject.id,
        creatorId: testUser.id,
      };
      const createdTask = await TaskModel.create(taskData);
      const foundTask = await TaskModel.findById(createdTask.id);

      expect(foundTask).toBeDefined();
      expect(foundTask?.id).toBe(createdTask.id);
      expect(foundTask?.title).toBe(createdTask.title);
    });

    it('should return null for non-existent ID', async () => {
      const foundTask = await TaskModel.findById('non-existent-id');
      expect(foundTask).toBeNull();
    });
  });

  describe('findByIdWithRelations', () => {
    it('should find task with all relations', async () => {
      const taskData = {
        ...testTaskData,
        projectId: testProject.id,
        creatorId: testUser.id,
        assigneeId: testUser2.id,
      };
      const createdTask = await TaskModel.create(taskData);
      
      const taskWithRelations = await TaskModel.findByIdWithRelations(createdTask.id);

      expect(taskWithRelations).toBeDefined();
      expect(taskWithRelations?.project).toBeDefined();
      expect(taskWithRelations?.project?.id).toBe(testProject.id);
      expect(taskWithRelations?.creator).toBeDefined();
      expect(taskWithRelations?.creator?.id).toBe(testUser.id);
      expect(taskWithRelations?.assignee).toBeDefined();
      expect(taskWithRelations?.assignee?.id).toBe(testUser2.id);
    });
  });

  describe('findMany', () => {
    beforeEach(async () => {
      // Create tasks with different properties
      await TaskModel.create({
        ...testTaskData,
        title: 'Task 1',
        projectId: testProject.id,
        creatorId: testUser.id,
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
      });

      await TaskModel.create({
        ...testTaskData,
        title: 'Task 2',
        projectId: testProject.id,
        creatorId: testUser.id,
        assigneeId: testUser2.id,
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.LOW,
      });

      await TaskModel.create({
        ...testTaskData,
        title: 'Task 3',
        projectId: testProject.id,
        creatorId: testUser2.id,
        status: TaskStatus.DONE,
        priority: TaskPriority.MEDIUM,
      });
    });

    it('should find all tasks without filters', async () => {
      const tasks = await TaskModel.findMany();
      expect(tasks).toHaveLength(3);
    });

    it('should filter tasks by project', async () => {
      const tasks = await TaskModel.findMany({ projectId: testProject.id });
      expect(tasks).toHaveLength(3);
      expect(tasks.every(t => t.projectId === testProject.id)).toBe(true);
    });

    it('should filter tasks by assignee', async () => {
      const tasks = await TaskModel.findMany({ assigneeId: testUser2.id });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].assigneeId).toBe(testUser2.id);
    });

    it('should filter tasks by creator', async () => {
      const tasks = await TaskModel.findMany({ creatorId: testUser.id });
      expect(tasks).toHaveLength(2);
      expect(tasks.every(t => t.creatorId === testUser.id)).toBe(true);
    });

    it('should filter tasks by status', async () => {
      const tasks = await TaskModel.findMany({ status: TaskStatus.TODO });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe(TaskStatus.TODO);
    });

    it('should filter tasks by priority', async () => {
      const tasks = await TaskModel.findMany({ priority: TaskPriority.HIGH });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].priority).toBe(TaskPriority.HIGH);
    });

    it('should sort tasks by priority and due date', async () => {
      const tasks = await TaskModel.findMany();
      // Should be sorted by priority desc, then due date asc, then created desc
      expect(tasks[0].priority).toBe(TaskPriority.HIGH);
    });
  });

  describe('update', () => {
    it('should update task data', async () => {
      const taskData = {
        ...testTaskData,
        projectId: testProject.id,
        creatorId: testUser.id,
      };
      const createdTask = await TaskModel.create(taskData);
      
      const updateData = {
        title: 'Updated Task Title',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
      };

      const updatedTask = await TaskModel.update(createdTask.id, updateData);

      expect(updatedTask.title).toBe(updateData.title);
      expect(updatedTask.status).toBe(updateData.status);
      expect(updatedTask.priority).toBe(updateData.priority);
      expect(updatedTask.description).toBe(taskData.description); // Should remain unchanged
    });

    it('should set completedAt when status changes to DONE', async () => {
      const taskData = {
        ...testTaskData,
        projectId: testProject.id,
        creatorId: testUser.id,
      };
      const createdTask = await TaskModel.create(taskData);
      expect(createdTask.completedAt).toBeNull();

      const updatedTask = await TaskModel.update(createdTask.id, { status: TaskStatus.DONE });

      expect(updatedTask.status).toBe(TaskStatus.DONE);
      expect(updatedTask.completedAt).toBeDefined();
      expect(updatedTask.completedAt).toBeInstanceOf(Date);
    });

    it('should clear completedAt when status changes from DONE', async () => {
      const taskData = {
        ...testTaskData,
        projectId: testProject.id,
        creatorId: testUser.id,
        status: TaskStatus.DONE,
      };
      const createdTask = await TaskModel.create(taskData);
      
      // Manually set completedAt
      await testPrisma.task.update({
        where: { id: createdTask.id },
        data: { completedAt: new Date() },
      });

      const updatedTask = await TaskModel.update(createdTask.id, { status: TaskStatus.IN_PROGRESS });

      expect(updatedTask.status).toBe(TaskStatus.IN_PROGRESS);
      expect(updatedTask.completedAt).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update task status', async () => {
      const taskData = {
        ...testTaskData,
        projectId: testProject.id,
        creatorId: testUser.id,
      };
      const createdTask = await TaskModel.create(taskData);

      const updatedTask = await TaskModel.updateStatus(createdTask.id, TaskStatus.IN_PROGRESS);

      expect(updatedTask.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  describe('assign and unassign', () => {
    let task: any;

    beforeEach(async () => {
      const taskData = {
        ...testTaskData,
        projectId: testProject.id,
        creatorId: testUser.id,
      };
      task = await TaskModel.create(taskData);
    });

    describe('assign', () => {
      it('should assign task to user', async () => {
        const assignedTask = await TaskModel.assign(task.id, testUser2.id);

        expect(assignedTask.assigneeId).toBe(testUser2.id);
      });
    });

    describe('unassign', () => {
      beforeEach(async () => {
        await TaskModel.assign(task.id, testUser2.id);
      });

      it('should unassign task', async () => {
        const unassignedTask = await TaskModel.unassign(task.id);

        expect(unassignedTask.assigneeId).toBeNull();
      });
    });
  });

  describe('getOverdueTasks', () => {
    beforeEach(async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Overdue task
      await TaskModel.create({
        ...testTaskData,
        title: 'Overdue Task',
        projectId: testProject.id,
        creatorId: testUser.id,
        dueDate: yesterday,
        status: TaskStatus.TODO,
      });

      // Not overdue task
      await TaskModel.create({
        ...testTaskData,
        title: 'Future Task',
        projectId: testProject.id,
        creatorId: testUser.id,
        dueDate: tomorrow,
        status: TaskStatus.TODO,
      });

      // Completed overdue task (should not be included)
      await TaskModel.create({
        ...testTaskData,
        title: 'Completed Overdue Task',
        projectId: testProject.id,
        creatorId: testUser.id,
        dueDate: yesterday,
        status: TaskStatus.DONE,
      });
    });

    it('should find overdue tasks', async () => {
      const overdueTasks = await TaskModel.getOverdueTasks();
      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].title).toBe('Overdue Task');
    });

    it('should filter overdue tasks by project', async () => {
      const overdueTasks = await TaskModel.getOverdueTasks(testProject.id);
      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].projectId).toBe(testProject.id);
    });
  });

  describe('getTasksDueSoon', () => {
    beforeEach(async () => {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      // Due today
      await TaskModel.create({
        ...testTaskData,
        title: 'Due Today',
        projectId: testProject.id,
        creatorId: testUser.id,
        dueDate: today,
        status: TaskStatus.TODO,
      });

      // Due tomorrow
      await TaskModel.create({
        ...testTaskData,
        title: 'Due Tomorrow',
        projectId: testProject.id,
        creatorId: testUser.id,
        dueDate: tomorrow,
        status: TaskStatus.TODO,
      });

      // Due day after tomorrow (should not be included)
      await TaskModel.create({
        ...testTaskData,
        title: 'Due Later',
        projectId: testProject.id,
        creatorId: testUser.id,
        dueDate: dayAfterTomorrow,
        status: TaskStatus.TODO,
      });
    });

    it('should find tasks due soon', async () => {
      const tasksDueSoon = await TaskModel.getTasksDueSoon();
      expect(tasksDueSoon).toHaveLength(2);
      expect(tasksDueSoon.map(t => t.title)).toContain('Due Today');
      expect(tasksDueSoon.map(t => t.title)).toContain('Due Tomorrow');
    });
  });

  describe('statistics', () => {
    beforeEach(async () => {
      // Create tasks with different statuses and priorities
      await TaskModel.create({
        ...testTaskData,
        title: 'Task 1',
        projectId: testProject.id,
        creatorId: testUser.id,
        assigneeId: testUser2.id,
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
      });

      await TaskModel.create({
        ...testTaskData,
        title: 'Task 2',
        projectId: testProject.id,
        creatorId: testUser.id,
        assigneeId: testUser2.id,
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
      });

      await TaskModel.create({
        ...testTaskData,
        title: 'Task 3',
        projectId: testProject.id,
        creatorId: testUser2.id,
        status: TaskStatus.DONE,
        priority: TaskPriority.LOW,
      });
    });

    describe('getProjectStatistics', () => {
      it('should return project task statistics', async () => {
        const stats = await TaskModel.getProjectStatistics(testProject.id);

        expect(stats.status.todo).toBe(1);
        expect(stats.status.inProgress).toBe(1);
        expect(stats.status.done).toBe(1);
        expect(stats.status.total).toBe(3);

        expect(stats.priority.high).toBe(1);
        expect(stats.priority.medium).toBe(1);
        expect(stats.priority.low).toBe(1);

        expect(stats.assignees).toBe(1); // Only testUser2 has assigned tasks
      });
    });

    describe('getUserStatistics', () => {
      it('should return user task statistics', async () => {
        const stats = await TaskModel.getUserStatistics(testUser2.id);

        expect(stats.assigned.todo).toBe(1);
        expect(stats.assigned.inProgress).toBe(1);
        expect(stats.assigned.done).toBe(0);
        expect(stats.assigned.total).toBe(2);

        expect(stats.created).toBe(1); // testUser2 created 1 task
      });
    });
  });

  describe('delete', () => {
    it('should delete task', async () => {
      const taskData = {
        ...testTaskData,
        projectId: testProject.id,
        creatorId: testUser.id,
      };
      const task = await TaskModel.create(taskData);
      
      const deletedTask = await TaskModel.delete(task.id);
      expect(deletedTask.id).toBe(task.id);

      const foundTask = await TaskModel.findById(task.id);
      expect(foundTask).toBeNull();
    });
  });
});