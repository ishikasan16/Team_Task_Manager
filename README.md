# Team Task Manager

A full-stack collaborative task management app built for the assignment. Users can sign up, create projects, add members, assign tasks, update task status, and view project dashboard metrics.

## Features

- JWT authentication with secure password hashing
- Project creation with the creator automatically assigned as Admin
- Admin controls for adding/removing project members
- Role-based access:
  - Admins can manage project members and all tasks
  - Members can view project tasks assigned to them and update task status
- Task fields: title, description, due date, priority, assignee, status
- Dashboard metrics:
  - Total tasks
  - Tasks by status
  - Tasks per user
  - Overdue tasks
- RESTful Express API
- MongoDB database using Mongoose relationships
- React frontend served by the same Express app in production

## Tech Stack

- Frontend: React, Vite, Lucide React
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Auth: JWT, bcryptjs
- Deployment: Railway

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from the example:

```bash
cp .env.example .env
```

3. Add your environment variables:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/team_task_manager
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
PORT=5000
```

4. Start development servers:

```bash
npm run dev
```

5. Open:

```text
http://localhost:5173
```

## Production Build

```bash
npm run build
npm start
```

The Express server serves the compiled React app from `dist`.

## Railway Deployment

1. Push this repository to GitHub.
2. Create a new Railway project from the GitHub repository.
3. Add environment variables in Railway:

```env
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-secret
CLIENT_URL=https://your-railway-app.up.railway.app
```

4. Railway will run:

```bash
npm install
npm run build
npm start
```

5. After deployment, use the generated Railway public URL as the live application URL.

## API Overview

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Projects

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `POST /api/projects/:projectId/members`
- `DELETE /api/projects/:projectId/members/:userId`

### Tasks

- `GET /api/tasks?projectId=PROJECT_ID`
- `POST /api/tasks`
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`

### Dashboard

- `GET /api/dashboard/:projectId`

## Demo Video Checklist

Use a 2-5 minute recording to show:

- Signup and login
- Project creation
- Adding a member by email
- Creating and assigning tasks
- Updating task status as a member
- Dashboard counts and overdue task behavior
- Railway live app and environment variables overview
