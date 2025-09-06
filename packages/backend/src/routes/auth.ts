import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordResetSchema,
  passwordResetConfirmSchema,
  changePasswordSchema,
  updateProfileSchema,
  deactivateAccountSchema,
} from '../validation/authSchemas';

const router = Router();
const authService = new AuthService();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        tokens,
      },
    });
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.login(req.body);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        tokens,
      },
    });
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh',
  validate(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens },
    });
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout',
  validate(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);

    res.json({
      success: true,
      message: 'Logout successful',
    });
  })
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout user from all devices
 * @access  Private
 */
router.post('/logout-all',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await authService.logoutAllDevices(userId);

    res.json({
      success: true,
      message: 'Logged out from all devices',
    });
  })
);

/**
 * @route   POST /api/auth/password-reset
 * @desc    Request password reset
 * @access  Public
 */
router.post('/password-reset',
  validate(passwordResetSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.requestPasswordReset(req.body);

    res.json({
      success: true,
      message: 'Password reset email sent if account exists',
    });
  })
);

/**
 * @route   POST /api/auth/password-reset/confirm
 * @desc    Confirm password reset
 * @access  Public
 */
router.post('/password-reset/confirm',
  validate(passwordResetConfirmSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.confirmPasswordReset(req.body);

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  })
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post('/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await authService.getUserProfile(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          isActive: user.isActive,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          ownedProjects: user.ownedProjects?.length || 0,
          projectMembers: user.projectMembers?.length || 0,
          createdTasks: user.createdTasks?.length || 0,
          unreadNotifications: user.notifications?.length || 0,
        },
      },
    });
  })
);

/**
 * @route   PUT /api/auth/me
 * @desc    Update user profile
 * @access  Private
 */
router.put('/me',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await authService.updateUserProfile(userId, req.body);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          isActive: user.isActive,
          preferences: user.preferences,
          updatedAt: user.updatedAt,
        },
      },
    });
  })
);

/**
 * @route   POST /api/auth/deactivate
 * @desc    Deactivate user account
 * @access  Private
 */
router.post('/deactivate',
  authenticate,
  validate(deactivateAccountSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { password } = req.body;

    await authService.deactivateAccount(userId, password);

    res.json({
      success: true,
      message: 'Account deactivated successfully',
    });
  })
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token (for testing)
 * @access  Private
 */
router.get('/verify',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user,
      },
    });
  })
);

export default router;
