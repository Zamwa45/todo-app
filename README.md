# Professional Todo App

A full-stack todo application with a handcrafted professional UI, React frontend, and Express + SQLite backend.

## Project Structure

- `/frontend` — React (Vite) client
- `/backend` — Node.js/Express REST API with SQLite
- `package.json` (root) — scripts for managing frontend and backend

## Features

- Add, edit, delete, and complete tasks
- Filter tasks by status (all, active, completed)
- Priority levels (low, medium, high) with visual indicators
- Due date support using a date picker
- Search by task title/description and priority filter
- Responsive layout for desktop and mobile
- RESTful backend with validation, CORS, and error handling
- Task schema fields:
  - `id`, `title`, `description`, `priority`, `dueDate`, `completed`, `createdAt`, `updatedAt`

## Setup

### 1) Install dependencies

From repository root:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2) Run in development

```bash
npm run dev
```

This starts:
- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

### 3) Build frontend

```bash
npm run build
```

### 4) Lint frontend

```bash
npm run lint
```

### 5) Test backend

```bash
npm run test
```

## API Endpoints

- `GET /api/tasks` — list tasks
- `POST /api/tasks` — create task
- `PUT /api/tasks/:id` — update task fields
- `DELETE /api/tasks/:id` — delete task

## Notes

- SQLite database is stored in `backend/data/tasks.db`.
- You can override DB location with `DB_PATH`.
- You can override backend port with `PORT`.
