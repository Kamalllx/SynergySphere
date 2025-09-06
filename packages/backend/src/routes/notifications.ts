import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { NotificationService } from '../services/NotificationService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const notificationService = new NotificationService();

// Validation schemas
const notificationQuerySchema = Joi.object({
  type: Joi.alternatives().try(
    Joi.string().valid('TASK_ASSIGNED', 'TASK_DUE', 'MENTION', 'PROJECT_UPDATE'),
    Joi.array().items(Joi.string().valid('TASK_ASSIGNED', 'TASK_DUE', 'MENTION', 'PROJECT_UPDATE'))
  ).optional(),
  isRead: Joi.boolean().optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

const preferencesSchema = Joi.object({
  emailNotifications: Joi.boolean().optional(),
  pushNotifications: Joi.boolean().optional(),
  taskAssignments: Joi.boolean().optional(),
  projectUpdates: Joi.boolean().optional(),
  mentions: Joi.boolean().optional(),
}).min(1);

// Routes

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  validate(notificationQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { limit, offset, ...filters } = req.query;

    const result = await notificationService.getUserNotifications(
      { userId, ...filters } as any,
      {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      }
    );

    res.json({
      success: true,
      data: result.notifications,
      pagination: {
        total: result.total,
        unread: result.unread,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  })
);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
  '/:id/read',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const notification = await notificationService.markAsRead(id, userId);

    res.json({
      success: true,
      data: notification,
    });
  })
);

/**
 * @route   PUT /api/notifications/read
 * @desc    Mark multiple notifications as read
 * @access  Private
 */
router.put(
  '/read',
  authenticate,
  validate(Joi.object({
    notificationIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { notificationIds } = req.body;

    const count = await notificationService.markMultipleAsRead(notificationIds, userId);

    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      data: { count },
    });
  })
);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put(
  '/read-all',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const count = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      data: { count },
    });
  })
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await notificationService.deleteNotification(id, userId);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  })
);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get(
  '/preferences',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const preferences = await notificationService.getUserPreferences(userId);

    res.json({
      success: true,
      data: preferences,
    });
  })
);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put(
  '/preferences',
  authenticate,
  validate(preferencesSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const preferences = await notificationService.updateUserPreferences(userId, req.body);

    res.json({
      success: true,
      data: preferences,
    });
  })
);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const stats = await notificationService.getUserNotificationStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * @route   POST /api/notifications/test
 * @desc    Send test notification (development only)
 * @access  Private
 */
router.post(
  '/test',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const notification = await notificationService.sendTestNotification(userId);

    res.json({
      success: true,
      message: 'Test notification sent',
      data: notification,
    });
  })
);

export default router;
