import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { MessageService } from '../services/MessageService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const messageService = new MessageService();

// Validation schemas
const createMessageSchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
  projectId: Joi.string().uuid().required(),
  parentId: Joi.string().uuid().optional(),
  mentions: Joi.array().items(Joi.string().uuid()).optional(),
});

const updateMessageSchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
});

const messageQuerySchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  parentId: Joi.string().uuid().optional().allow(null),
  authorId: Joi.string().uuid().optional(),
  search: Joi.string().max(100).optional(),
  hasReplies: Joi.boolean().optional(),
  mentions: Joi.string().uuid().optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

// Routes

/**
 * @route   GET /api/messages
 * @desc    Get messages for a project
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  validate(messageQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { limit, offset, sortOrder, ...filters } = req.query;

    const result = await messageService.getProjectMessages(userId, filters as any, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      sortOrder: sortOrder as any,
    });

    res.json({
      success: true,
      data: result.messages,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  })
);

/**
 * @route   POST /api/messages
 * @desc    Create a new message
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate(createMessageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const messageData = {
      ...req.body,
      authorId: userId,
    };

    const message = await messageService.createMessage(messageData, userId);

    res.status(201).json({
      success: true,
      data: message,
    });
  })
);

/**
 * @route   GET /api/messages/:id/thread
 * @desc    Get message with full thread
 * @access  Private
 */
router.get(
  '/:id/thread',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const message = await messageService.getMessageThread(id, userId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found or access denied',
      });
    }

    res.json({
      success: true,
      data: message,
    });
  })
);

/**
 * @route   PUT /api/messages/:id
 * @desc    Update a message
 * @access  Private (author only)
 */
router.put(
  '/:id',
  authenticate,
  validate(updateMessageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const message = await messageService.updateMessage(id, userId, req.body);

    res.json({
      success: true,
      data: message,
    });
  })
);

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message
 * @access  Private (author or admin)
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await messageService.deleteMessage(id, userId);

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  })
);

/**
 * @route   GET /api/messages/mentions
 * @desc    Get messages where user is mentioned
 * @access  Private
 */
router.get(
  '/mentions',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { projectId, limit, offset } = req.query;

    const result = await messageService.getUserMentions(userId, {
      projectId: projectId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.messages,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  })
);

/**
 * @route   GET /api/messages/search
 * @desc    Search messages across projects
 * @access  Private
 */
router.get(
  '/search',
  authenticate,
  validate(Joi.object({
    q: Joi.string().min(2).max(100).required(),
    projectIds: Joi.array().items(Joi.string().uuid()).optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }), 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { q, projectIds, limit, offset } = req.query;

    const result = await messageService.searchMessages(userId, q as string, {
      projectIds: projectIds as string[],
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.messages,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  })
);

export default router;
