import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AppError } from './errorHandler';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

const authService = new AuthService();

/**
 * Authenticate user via JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    // Verify token using AuthService
    const decoded = await authService.verifyToken(token);
    
    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    
    return next(new AppError('Invalid or expired token', 401));
  }
};

/**
 * Authorize user based on roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // For now, we'll implement basic role checking
    // This can be extended based on project member roles
    // TODO: Implement proper role-based authorization
    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = await authService.verifyToken(token);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      };
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};