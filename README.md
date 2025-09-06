# SynergySphere MVP

An intelligent team collaboration platform designed to act as a central nervous system for teams. SynergySphere goes beyond traditional project management by providing proactive insights and seamless collaboration tools.

## Features

- **User Authentication**: Secure registration, login, and session management
- **Project Management**: Create, manage, and organize team projects
- **Task Management**: Assign tasks with deadlines and track progress
- **Team Communication**: Project-specific threaded discussions
- **Real-time Updates**: Live notifications and progress tracking
- **Cross-Platform**: Progressive Web App (PWA) for mobile and desktop
- **Responsive Design**: Optimized for all device sizes

## Tech Stack

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) for components
- Redux Toolkit for state management
- Socket.io for real-time features
- Vite for build tooling
- PWA capabilities

### Backend
- Node.js with Express.js
- TypeScript
- PostgreSQL with Prisma ORM
- Redis for caching and sessions
- Socket.io for WebSocket connections
- JWT authentication

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd synergy-sphere
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp packages/backend/.env.example packages/backend/.env
   cp packages/frontend/.env.example packages/frontend/.env
   ```

4. **Start development environment with Docker**
   ```bash
   npm run docker:dev
   ```

   Or run services individually:
   ```bash
   # Start database and Redis
   docker-compose -f docker-compose.dev.yml up postgres redis -d
   
   # Run backend and frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432
   - Redis: localhost:6379

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications for production
- `npm run test` - Run tests for both applications
- `npm run lint` - Lint all code
- `npm run format` - Format code with Prettier
- `npm run docker:dev` - Start full development environment with Docker

## Project Structure

```
synergy-sphere/
├── packages/
│   ├── backend/          # Express.js API server
│   │   ├── src/
│   │   ├── prisma/       # Database schema and migrations
│   │   └── tests/
│   └── frontend/         # React PWA application
│       ├── src/
│       ├── public/
│       └── tests/
├── docker-compose.dev.yml
└── package.json          # Workspace configuration
```

## Development Workflow

1. **Backend Development**
   - API endpoints in `packages/backend/src/routes/`
   - Database models in `packages/backend/prisma/schema.prisma`
   - Business logic in `packages/backend/src/services/`

2. **Frontend Development**
   - React components in `packages/frontend/src/components/`
   - Redux slices in `packages/frontend/src/store/`
   - Pages in `packages/frontend/src/pages/`

3. **Database Changes**
   ```bash
   cd packages/backend
   npx prisma migrate dev --name your-migration-name
   npx prisma generate
   ```

## Testing

- **Backend**: Jest with Supertest for API testing
- **Frontend**: Jest with React Testing Library
- **E2E**: Cypress (to be added)

## Deployment

Production deployment configurations and instructions will be added as the project progresses.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

This project is licensed under the MIT License.