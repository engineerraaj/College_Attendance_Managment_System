# College Attendance Management System

Full-stack starter application: React + Vite frontend, Express + MongoDB backend, JWT authentication, and role-based workspaces (admin, HOD, faculty, student).

> This is a development starter, not a production-certified student-record system. Review the security checklist before using real data.

## Requirements

- Node.js 20 or newer (Node 22 LTS recommended)
- npm 10+
- MongoDB 6+ running locally, or a MongoDB Atlas connection string
- VS Code (recommended)

## Run in VS Code

1. Extract the ZIP and open the `College_Attendance_Management_System` folder in VS Code.
2. Start MongoDB (or create an Atlas database).
3. Copy `backend/.env.example` to `backend/.env`.
4. Set `MONGODB_URI` and replace `JWT_SECRET` with a random secret of at least 32 characters.
5. Open the VS Code terminal in the project root and run:

   ```bash
   npm install
   npm run install:all
   npm run seed
   npm run dev
   ```

6. Open **http://localhost:5173**.

The root `npm run dev` command starts both the API (`http://localhost:5000`) and frontend (`http://localhost:5173`) together. Keep that terminal open while using the app.

### Alternative: start services separately

```bash
cd backend
npm install
npm run seed
npm run dev
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```



## Environment variables

`backend/.env.example` (copy it to `backend/.env`):

- `PORT`: API port (default 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: long random signing secret
- `JWT_EXPIRES_IN`: token lifetime (default 8h)
- `CLIENT_URL`: allowed frontend origin (default http://localhost:5173)
- `ATTENDANCE_THRESHOLD`: attendance threshold (default 75)

`frontend/.env.example` contains `VITE_API_URL` (default `http://localhost:5000/api`). Copy it to `frontend/.env` only if you need to change the API URL.

## Useful commands (project root)

- `npm run dev` — run frontend and backend together
- `npm run build` — build the frontend for production
- `npm run seed` — create demo users and academic data
- `npm run start` — start the backend in production mode
- `npm run install:all` — install both workspaces' dependencies

## Main API routes

- `/api/auth` — login, current user, change password
- `/api/users`, `/api/students`, `/api/faculty`
- `/api/departments`, `/api/courses`, `/api/semesters`, `/api/subjects`, `/api/sections`
- `/api/enrollments`, `/api/timetable`
- `/api/attendance` — mark/list attendance and student summary
- `/api/attendance-requests` — create/list/review correction requests
- `/api/reports/summary`
- `/api/notices`, `/api/notifications`, `/api/audit-logs`
- `/api/health` — API health check (requires database connection at startup)

## Attendance rules

- Unique index prevents duplicate student + subject + date + session records.
- Faculty must be assigned to the subject and students must be enrolled in the selected section.
- Attendance statuses: `present`, `absent`, `late`, `leave`.
- Percentage: `(present + late) / (present + absent + late) * 100`; leave is excluded.

## Important limitations and production checklist

This ZIP contains a functional project foundation, but not every screen is a complete CRUD workflow. In particular, complex academic records require linked IDs and are not safely creatable through the generic name/code form.

Before production use:
- enforce complete per-resource authorization and request validation;
- complete correction-request approval flows and add integration/e2e tests;
- add password reset, refresh-token revocation, MFA for privileged accounts, and account lockout;
- use HTTPS, secure secret storage, strict CORS, monitoring, backups, and restore drills;
- review privacy and education-record obligations applicable to your jurisdiction.

## Project structure

- `frontend/` — Vite + React application
- `backend/` — Express API, Mongoose models, middleware, routes, seed script
- root `package.json` — convenience commands for running both services
