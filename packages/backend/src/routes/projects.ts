import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ProjectService } from '../services/ProjectService';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const projectService = new ProjectService();

// Validation schemas
const createProjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  isPublic: Joi.boolean().optional(),
  allowMemberInvites: Joi.boolean().optional(),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional().allow(null, ''),
  isPublic: Joi.boolean().optional(),
  allowMemberInvites: Joi.boolean().optional(),
}).min(1);

const addMemberSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  role: Joi.string().valid('ADMIN', 'MEMBER').optional(),
});

const querySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
  search: Joi.string().max(100).optional(),
  sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

// Routes

/**
 * @route   GET /api/projects
 * @desc    Get user's projects
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  validate(querySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { limit, offset, search, sortBy, sortOrder } = req.query;
    const userId = req.user!.id;

    const result = await projectService.getUserProjects(userId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      search: search as string,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    res.json({
      success: true,
      data: result.projects,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  })
);

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate(createProjectSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const projectData = {
      ...req.body,
      ownerId: userId,
    };

    const project = await projectService.createProject(projectData);

    res.status(201).json({
      success: true,
      data: project,
    });
  })
);

/**
 * @route   GET /api/projects/:id
 * @desc    Get project by ID
 * @access  Private (project members only)
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await projectService.getProjectById(id, userId);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied',
      });
    }

    res.json({
      success: true,
      data: project,
    });
  })
);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project details
 * @access  Private (project owner/admin only)
 */
router.put(
  '/:id',
  authenticate,
  validate(updateProjectSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await projectService.updateProject(id, userId, req.body);

    res.json({
      success: true,
      data: project,
    });
  })
);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete a project
 * @access  Private (project owner only)
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await projectService.deleteProject(id, userId);

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  })
);

/**
 * @route   POST /api/projects/:id/members
 * @desc    Add member to project
 * @access  Private (project owner/admin or if invites allowed)
 */
router.post(
  '/:id/members',
  authenticate,
  validate(addMemberSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const member = await projectService.addMember(id, userId, req.body);

    res.status(201).json({
      success: true,
      data: member,
    });
  })
);

/**
 * @route   DELETE /api/projects/:id/members/:userId
 * @desc    Remove member from project
 * @access  Private (project owner/admin or self)
 */
router.delete(
  '/:id/members/:userId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId: userIdToRemove } = req.params;
    const requesterId = req.user!.id;

    await projectService.removeMember(id, requesterId, userIdToRemove);

    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  })
);

/**
 * @route   PUT /api/projects/:id/members/:userId/role
 * @desc    Update member role
 * @access  Private (project owner only)
 */
router.put(
  '/:id/members/:userId/role',
  authenticate,
  validate(Joi.object({ role: Joi.string().valid('ADMIN', 'MEMBER').required() })),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, userId: targetUserId } = req.params;
    const requesterId = req.user!.id;
    const { role } = req.body;

    const member = await projectService.updateMemberRole(id, requesterId, targetUserId, role);

    res.json({
      success: true,
      data: member,
    });
  })
);

/**
 * @route   GET /api/projects/:id/stats
 * @desc    Get project statistics
 * @access  Private (project members only)
 */
router.get(
  '/:id/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify access
    const project = await projectService.getProjectById(id, userId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied',
      });
    }

    const stats = await projectService.getProjectStats(id);

    res.json({
      success: true,
      data: stats,
    });
  })
);

export default router;
