# SynergySphere Integration Guide

## Current Status
The frontend and backend are now integrated with an adapter layer that handles data transformation between the two systems.

## Quick Start

### 1. Start the Backend Server
```bash
cd packages/backend
npm install
npm run dev
```

**Important:** The backend should be running on port 3001 (check the console output)

### 2. Start the Frontend Server
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on port 3000.

### 3. Verify the Setup
1. Open http://localhost:3000 in your browser
2. Navigate to the Projects page
3. The page will now attempt to load projects from the API

## Architecture

### Data Flow
1. **Frontend** makes requests using the expected data format (e.g., `status: 'active'`)
2. **API Adapter** (`frontend/lib/api-adapter-v2.ts`) transforms the request
3. **Backend API** receives the transformed request (e.g., `status: 'ACTIVE'`)
4. **Backend** returns data in its format
5. **API Adapter** transforms the response back to frontend format
6. **Frontend** displays the data

### Key Files

#### Frontend
- `frontend/lib/api-adapter-v2.ts` - Main adapter that transforms data
- `frontend/lib/api.ts` - Base API client
- `frontend/app/projects/page.tsx` - Projects page using the API

#### Backend
- `packages/backend/src/routes/auth.ts` - Authentication endpoints
- `packages/backend/src/routes/projects.ts` - Project management
- `packages/backend/src/routes/tasks.ts` - Task management

## API Endpoints

### Authentication (Required First!)
```bash
# Register
POST http://localhost:3001/api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Test User"
}

# Login
POST http://localhost:3001/api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Projects
```bash
# Get all projects (requires auth token)
GET http://localhost:3001/api/projects
Authorization: Bearer <token>

# Create project
POST http://localhost:3001/api/projects
Authorization: Bearer <token>
{
  "name": "My Project",
  "description": "Project description"
}
```

## Testing

### Quick Test
Run the PowerShell test script:
```powershell
.\test-endpoints.ps1
```

This will test:
- Health endpoint
- Authentication (register/login)
- Project creation and retrieval

## Common Issues & Solutions

### Issue: "Failed to connect to server"
**Solution:** Make sure the backend is running on port 3001
```bash
cd packages/backend
npm run dev
```

### Issue: "401 Unauthorized" errors
**Solution:** You need to authenticate first. The frontend stores the token in localStorage.

### Issue: No data showing in frontend
**Solution:** 
1. Check browser console for errors
2. Verify backend is running
3. Check Network tab to see if requests are being made
4. Make sure you have created some test data

## Data Format Mapping

The adapter handles these transformations automatically:

| Frontend Format | Backend Format |
|----------------|----------------|
| status: 'active' | status: 'ACTIVE' |
| status: 'todo' | status: 'TODO' |
| priority: 'high' | priority: 'HIGH' |
| assignedTo | assigneeId |
| project.name | project.title |

## Next Steps

1. **Create Test Data**: Use the API or UI to create projects and tasks
2. **Test Real-time Updates**: WebSocket connections for live updates
3. **Implement User Management**: Complete user profile and settings
4. **Add More Features**: Notifications, file uploads, etc.

## Development Tips

### Frontend Development
- Always use the adapter services from `lib/api-adapter-v2.ts`
- Check browser console for API errors
- Use React DevTools to inspect component state

### Backend Development
- Check terminal for SQL queries (Prisma logging)
- Verify database migrations are up to date
- Use Postman or similar to test endpoints directly

### Debugging
1. **Enable detailed logging:**
   - Frontend: Open browser console
   - Backend: Check terminal output

2. **Test API directly:**
   ```bash
   curl http://localhost:3001/health
   ```

3. **Check data transformation:**
   - Add console.log in adapter functions
   - Verify data format before and after transformation

## Support

If you encounter issues:
1. Check this guide first
2. Verify all services are running
3. Check browser and terminal console for errors
4. Review the adapter transformations in `api-adapter-v2.ts`
