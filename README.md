# Team Task Manager (TaskFlow)

A full-stack web app where teams can create projects, assign tasks, and track progress — with role-based access (Admin / Member).

## Features
- **Authentication** — JWT-based signup & login. Passwords hashed with bcrypt.
- **Role-based access control (project-scoped)**
  - One account, no global role. Anyone can sign up.
  - You become the **admin** of every project you create — manage members and tasks there.
  - You're a regular **member** on projects others invite you to — see assigned work and update statuses.
  - Same person can be admin on one project and a member on another.
- **Projects & teams** — projects own a member list; members are added by email after signup.
- **Tasks** — title, description, priority (Low/Medium/High), status (Todo / In Progress / Review / Completed), due date, assignee.
- **Dashboard** — totals, completed/pending/overdue, by-status breakdown, completion donut, upcoming tasks.

## Tech stack
- **Frontend** — React 19 + Vite, React Router v7, Axios, custom CSS design system (glassmorphism, dark theme).
- **Backend** — Node.js, Express 5, MongoDB (Mongoose), JWT, bcryptjs.
- **Deploy** — Single Node service on Render: builds the React client and serves it from Express.

## REST API
All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Path                                      | Role       | Purpose                              |
|--------|-------------------------------------------|------------|--------------------------------------|
| POST   | `/auth/signup`                            | public     | Register a user                      |
| POST   | `/auth/login`                             | public     | Get a JWT                            |
| GET    | `/auth/me`                                | any        | Current user profile                 |
| GET    | `/projects`                               | any auth user | List projects you own or are a member of |
| GET    | `/projects/:id`                           | member+ of project | Single project                  |
| POST   | `/projects`                               | any auth user | Create project (you become its admin) |
| DELETE | `/projects/:id`                           | project admin | Delete project + tasks               |
| POST   | `/projects/:id/members`                   | project admin | Add member by email                  |
| DELETE | `/projects/:id/members/:userId`           | project admin | Remove member                        |
| GET    | `/tasks/my`                               | any auth user | Tasks assigned to current user       |
| GET    | `/tasks/project/:projectId`               | member+ of project | Tasks in a project              |
| POST   | `/tasks`                                  | project admin | Create task                          |
| PUT    | `/tasks/:id`                              | assignee or project admin (status); admin only (other fields) | Update task |
| DELETE | `/tasks/:id`                              | project admin | Delete task                          |
| GET    | `/health`                                 | public        | Health check                         |

## Local setup

### Backend
```bash
cd server
npm install
cp .env.example .env   # set MONGODB_URI and JWT_SECRET
npm run dev            # nodemon on http://localhost:5000
```

Optional: seed a demo user (email: `demo@taskflow.com`, password: `demo1234`).
```bash
node server/seed.js
```
Log in with that account and click **+ New Project** — you'll be the admin of any project you create.

### Frontend
```bash
cd client
npm install
npm run dev   # vite on http://localhost:5173
```
The Vite dev server proxies `/api` to `http://localhost:5000`, so no CORS or env wiring is needed locally.

### From the repo root
```bash
npm run install:all
npm run dev:server   # one terminal
npm run dev:client   # another terminal
```

## Production build
```bash
npm run build   # installs both, builds React into client/dist
npm start       # Express serves /api and the static build on PORT
```
Open `http://localhost:5000` — Express hosts both the API and the React app.

## Deployment (Render)

This repo is configured as a **single Render web service** that builds the client and runs the server.

1. Push this repo to GitHub.
2. Create a MongoDB instance — easiest is **MongoDB Atlas** (free tier). Copy the connection string.
3. In Render: **New + → Web Service → Deploy from GitHub** → select this repo.
4. In the service's **Variables** tab add:
   - `MONGODB_URI` — your Atlas connection string
   - `JWT_SECRET` — a long random string
   - `NODE_ENV` — `production`
   - (Render sets `PORT` automatically; the server reads it.)
5. Deploy. Render uses the scripts in the root `package.json`:
   - **Install** — `npm install --prefix server --omit=dev` and `--prefix client`
   - **Build** — `npm run build --prefix client` → emits `client/dist`
   - **Start** — `npm start --prefix server` → Express serves the API and the SPA
   - **Health check** — `GET /api/health`
6. Open the generated Render domain — the app is live. Sign up to get started (you'll be the Admin of any project you create).

## Project structure
```
.
├── client/                 React + Vite app
│   └── src/{pages,components,context,utils}
├── server/                 Express + Mongoose API
│   ├── models/             User, Project, Task
│   ├── routes/             auth, project, task
│   ├── middleware/         protect, admin
│   ├── server.js           serves /api and client/dist in prod
│   └── seed.js             creates an initial admin user
├── nixpacks.toml           Railway build config
├── railway.json            Railway deploy config
└── package.json            workspace coordinator scripts
```

## Submission
- **Live URL:** [https://team-task-manager-whke.onrender.com](https://team-task-manager-whke.onrender.com)
- **GitHub Repo:** [https://github.com/Pragyavashisht08/Team-task-manager-](https://github.com/Pragyavashisht08/Team-task-manager-)
