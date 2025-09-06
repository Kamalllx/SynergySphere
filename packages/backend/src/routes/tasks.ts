import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { TaskService } from '../services/TaskService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const taskService = new TaskService();

// Validation schemas
const createTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional(),
  projectId: Joi.string().uuid().required(),
  assigneeId: Joi.string().uuid().optional(),
  dueDate: Joi.date().iso().optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').optional(),
  status: Joi.string().valid('TODO', 'IN_PROGRESS', 'DONE').optional(),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(1000).optional().allow(null, ''),
  assigneeId: Joi.string().uuid().optional().allow(null),
  dueDate: Joi.date().iso().optional().allow(null),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').optional(),
  status: Joi.string().valid('TODO', 'IN_PROGRESS', 'DONE').optional(),
}).min(1);

const taskQuerySchema = Joi.object({
  projectId: Joi.string().uuid().optional(),
  assigneeId: Joi.string().uuid().optional().allow('null'),
  creatorId: Joi.string().uuid().optional(),
  status: Joi.alternatives().try(
    Joi.string().valid('TODO', 'IN_PROGRESS', 'DONE'),
    Joi.array().items(Joi.string().valid('TODO', 'IN_PROGRESS', 'DONE'))
  ).optional(),
  priority: Joi.alternatives().try(
    Joi.string().valid('LOW', 'MEDIUM', 'HIGH'),
    Joi.array().items(Joi.string().valid('LOW', 'MEDIUM', 'HIGH'))
  ).optional(),
  dueDateFrom: Joi.date().iso().optional(),
  dueDateTo: Joi.date().iso().optional(),
  search: Joi.string().max(100).optional(),
  overdue: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
  sortBy: Joi.string().valid('title', 'dueDate', 'priority', 'createdAt', 'updatedAt').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

// Routes

/**
 * @route   GET /api/tasks
 * @desc    Get tasks with filtering
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  validate(taskQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { limit, offset, sortBy, sortOrder, ...filters } = req.query;

    const result = await taskService.getTasks(userId, filters as any, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as any,
    });

    res.json({
      success: true,
      data: result.tasks,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  })
);

/**
 * @route   GET /api/tasks/my
 * @desc    Get user's assigned tasks
 * @access  Private
 */
router.get(
  '/my',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const tasks = await taskService.getUserTasks(userId, {
      assignedToMe: true,
      status: ['TODO', 'IN_PROGRESS'],
    });

    res.json({
      success: true,
      data: tasks,
    });
  })
);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate(createTaskSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const taskData = {
      ...req.body,
      creatorId: userId,
    };

    const task = await taskService.createTask(taskData, userId);

    res.status(201).json({
      success: true,
      data: task,
    });
  })
);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task by ID
 * @access  Private (project members only)
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const task = await taskService.getTaskById(id, userId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied',
      });
    }

    res.json({
      success: true,
      data: task,
    });
  })
);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 * @access  Private (project members)
 */
router.put(
  '/:id',
  authenticate,
  validate(updateTaskSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const task = await taskService.updateTask(id, userId, req.body);

    res.json({
      success: true,
      data: task,
    });
  })
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 * @access  Private (task creator or project admin)
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await taskService.deleteTask(id, userId);

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  })
);

/**
 * @route   POST /api/tasks/bulk-status
 * @desc    Bulk update task status
 * @access  Private
 */
router.post(
  '/bulk-status',
  authenticate,
  validate(Joi.object({
    taskIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
    status: Joi.string().valid('TODO', 'IN_PROGRESS', 'DONE').required(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { taskIds, status } = req.body;

    const count = await taskService.bulkUpdateStatus(taskIds, status, userId);

    res.json({
      success: true,
      message: `${count} tasks updated successfully`,
      data: { count },
    });
  })
);

/**
 * @route   GET /api/tasks/project/:projectId/stats
 * @desc    Get task statistics for a project
 * @access  Private (project members)
 */
router.get(
  '/project/:projectId/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const stats = await taskService.getProjectTaskStats(projectId, userId);

    res.json({
      success: true,
      data: stats,
    });
  })
);

export default router;
