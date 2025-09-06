# Authentication System Documentation

## Overview

The SynergySphere backend implements a comprehensive JWT-based authentication system with the following features:

- User registration and login
- JWT access tokens with refresh token mechanism
- Password reset functionality
- User profile management
- Account deactivation
- Session management with Redis
- Email notifications for auth events

## Architecture

### Components

1. **AuthService** (`src/services/AuthService.ts`) - Core authentication logic
2. **Auth Routes** (`src/routes/auth.ts`) - HTTP endpoints for authentication
3. **Auth Middleware** (`src/middleware/auth.ts`) - JWT token verification
4. **Validation Schemas** (`src/validation/authSchemas.ts`) - Input validation
5. **Session Storage** (`src/utils/sessionStorage.ts`) - Redis-based session management

### Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: Signed with secret keys, configurable expiration
- **Refresh Tokens**: Stored in Redis with TTL
- **Password Strength**: Enforced validation rules
- **Rate Limiting**: Applied to auth endpoints
- **Email Verification**: Password reset via email

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "fullName": "John Doe",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token",
      "expiresIn": 900
    }
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token",
      "expiresIn": 900
    }
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "new_jwt_token",
      "refreshToken": "new_refresh_token",
      "expiresIn": 900
    }
  }
}
```

#### Logout
```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### Logout All Devices
```http
POST /api/auth/logout-all
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

### Password Management

#### Request Password Reset
```http
POST /api/auth/password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

#### Confirm Password Reset
```http
POST /api/auth/password-reset/confirm
Content-Type: application/json

{
  "token": "reset_token",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### User Profile

#### Get User Profile
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "isActive": true,
      "preferences": {},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "ownedProjects": 2,
      "projectMembers": 5,
      "createdTasks": 10,
      "unreadNotifications": 3
    }
  }
}
```

#### Update User Profile
```http
PUT /api/auth/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fullName": "John Smith",
  "preferences": {
    "emailNotifications": true,
    "pushNotifications": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Smith",
      "isActive": true,
      "preferences": {
        "emailNotifications": true,
        "pushNotifications": false
      },
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### Deactivate Account
```http
POST /api/auth/deactivate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "password": "CurrentPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account deactivated successfully"
}
```

#### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

## Authentication Middleware

### Usage in Routes

```typescript
import { authenticate, authorize, optionalAuth } from '../middleware/auth';

// Require authentication
router.get('/protected', authenticate, handler);

// Optional authentication
router.get('/public', optionalAuth, handler);

// Role-based authorization (placeholder)
router.get('/admin', authenticate, authorize('admin'), handler);
```

### Request Object Extension

The middleware extends the Express Request object:

```typescript
interface Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}
```

## Token Management

### Access Tokens
- **Type**: JWT
- **Expiration**: 15 minutes (configurable)
- **Payload**: `{ userId, email, name, iat, exp }`
- **Usage**: Authorization header: `Bearer <token>`

### Refresh Tokens
- **Type**: JWT
- **Expiration**: 7 days (configurable)
- **Storage**: Redis with TTL
- **Usage**: Token refresh endpoint

### Token Refresh Flow
1. Client sends refresh token to `/api/auth/refresh`
2. Server validates refresh token
3. Server generates new access and refresh tokens
4. Old refresh token is invalidated
5. New tokens are returned to client

## Password Requirements

### Validation Rules
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Hashing
- **Algorithm**: bcrypt
- **Salt Rounds**: 12
- **Storage**: Hashed password in database

## Session Management

### Redis Storage
- **Sessions**: `session:<sessionId>` with TTL
- **Refresh Tokens**: `refresh:<tokenId>` with TTL
- **Password Reset**: `password_reset:<userId>` with TTL

### Session Data Structure
```typescript
interface SessionData {
  userId: string;
  email: string;
  name: string;
  createdAt: number;
  lastActivity: number;
}
```

## Email Notifications

### Welcome Email
- Sent on successful registration
- Contains welcome message and app information

### Password Reset Email
- Sent when password reset is requested
- Contains reset link with token
- Token expires in 1 hour

### Email Templates
- HTML and text versions
- Responsive design
- Branded with SynergySphere styling

## Error Handling

### Common Error Responses

#### Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

#### Authentication Error
```json
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Authentication required",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### Token Expired
```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token expired",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## Environment Variables

### Required Variables
```env
# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=SynergySphere <noreply@synergyphere.com>
```

## Security Considerations

### Best Practices
1. **Token Storage**: Store tokens securely (httpOnly cookies recommended for web)
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Implement rate limiting on auth endpoints
4. **Password Policy**: Enforce strong password requirements
5. **Session Management**: Implement proper session cleanup
6. **Logging**: Log authentication events for security monitoring

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Content Security Policy
- XSS protection

## Testing

### Test Coverage
- Unit tests for AuthService
- Integration tests for auth endpoints
- Middleware testing
- Validation testing

### Test Commands
```bash
# Run all tests
npm test

# Run auth tests only
npm test -- --testPathPattern=auth

# Run with coverage
npm run test:coverage
```

## Integration with Existing Services

### Project Service
- User authentication required for all project operations
- Project membership validation
- Role-based access control

### Task Service
- User authentication required for task operations
- Project membership validation
- Task assignment permissions

### Message Service
- User authentication required for messaging
- Project membership validation
- Mention notifications

### Notification Service
- User authentication required for notifications
- User-specific notification delivery
- Preference management

## Migration from Existing System

### Steps
1. Deploy new authentication system
2. Update frontend to use new auth endpoints
3. Migrate existing user data (if any)
4. Update API clients
5. Test authentication flow
6. Monitor for issues

### Backward Compatibility
- Existing endpoints continue to work
- Gradual migration possible
- No breaking changes to existing functionality

## Monitoring and Logging

### Authentication Events
- Login attempts (success/failure)
- Token refresh events
- Password reset requests
- Account deactivations
- Suspicious activity

### Metrics
- Authentication success rate
- Token refresh frequency
- Session duration
- Failed login attempts
- Password reset requests

## Troubleshooting

### Common Issues

#### Token Expired
- **Cause**: Access token has expired
- **Solution**: Use refresh token to get new access token

#### Invalid Token
- **Cause**: Malformed or tampered token
- **Solution**: Re-authenticate user

#### Refresh Token Invalid
- **Cause**: Refresh token expired or revoked
- **Solution**: User must login again

#### Email Not Sending
- **Cause**: Email service configuration issue
- **Solution**: Check email credentials and SMTP settings

### Debug Mode
Enable debug logging in development:
```env
NODE_ENV=development
```

## Future Enhancements

### Planned Features
1. **Two-Factor Authentication (2FA)**
2. **OAuth Integration** (Google, GitHub, etc.)
3. **Account Lockout** after failed attempts
4. **Device Management** (view/manage logged-in devices)
5. **Audit Logging** for security events
6. **Password History** (prevent reuse)
7. **Account Recovery** via security questions

### API Versioning
- Current version: v1
- Backward compatibility maintained
- New features in future versions

## Support

For issues or questions about the authentication system:
- Check this documentation first
- Review error logs
- Test with provided examples
- Contact development team

---

**Last Updated**: January 2024
**Version**: 1.0.0
