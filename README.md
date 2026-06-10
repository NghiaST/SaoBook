# SBook

SBook is a full-stack story reading application. It provides story and chapter management, authentication, reading history, bookshelves, comments, reviews, text-to-speech controls, and separate author/admin workflows.

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zustand
- **Backend:** Node.js, Fastify, TypeScript, Prisma, PostgreSQL
- **Storage:** S3-compatible object storage, configured for Cloudflare R2
- **Authentication:** JWT access and refresh tokens
- **Email:** Resend
- **API documentation:** Swagger UI in development

## Repository Layout

```text
frontend/   React/Vite client application
backend/    Fastify API, Prisma schema, migrations, and seed data
ClassDiagramAndUseCase.md
            Domain and use-case design notes
Stack.md    Original technology stack notes
```

The frontend is organized by route-level pages and feature modules. The backend is organized by API modules such as auth, users, stories, chapters, comments, reviews, bookshelf, admin, and TTS.

## Prerequisites

- Node.js with npm
- A PostgreSQL database. Supabase PostgreSQL works with the current Prisma configuration.
- An S3-compatible bucket. Cloudflare R2 is the configured deployment target.
- A Resend API key for email features

## Local Setup

Install dependencies in both applications:

```bash
cd backend
npm install
npm run db:generate
npm run db:migrate:dev

cd ../frontend
npm install
```

Create `backend/.env` with the required values before starting the API. Secrets must stay local and must not be committed.

### Backend environment variables

Required:

```dotenv
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_ACCESS_SECRET=replace-with-a-long-random-value
JWT_REFRESH_SECRET=replace-with-a-long-random-value
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://...
RESEND_API_KEY=...
```

Optional values and defaults:

```dotenv
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
RESEND_EMAIL_FROM=SaoBook
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

`DATABASE_URL` is used by the application connection and `DIRECT_URL` is used by Prisma migrations. Use a direct PostgreSQL connection for `DIRECT_URL` when your provider also supplies a pooled connection URL.

### Frontend environment variables

Create `frontend/.env.local` when the API is not available at the Vite proxy or `/api` path:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

## Running Locally

Start the backend and frontend in separate terminals:

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

The default local URLs are:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:3000/health`
- Swagger UI: `http://localhost:3000/docs` (development only)

## Common Commands

### Backend

```bash
npm run build          # Compile TypeScript
npm run start          # Run the compiled API
npm run lint           # Lint backend source
npm run db:generate   # Generate Prisma Client
npm run db:migrate    # Apply committed migrations
npm run db:migrate:dev
npm run db:studio
npm run db:seed
```

### Frontend

```bash
npm run build          # Type-check and build for production
npm run preview        # Preview the production build
npm run lint           # Lint frontend source
```

## Database Workflow

1. Update `backend/prisma/schema.prisma`.
2. Create a development migration with `npm run db:migrate:dev` from `backend/`.
3. Review the generated SQL and schema changes.
4. Commit the migration with the related application changes.
5. Deploy with `npm run db:migrate`.

Do not edit an already-applied migration to change production data. Create a new migration instead.

## Deployment

The backend includes `backend/render.yaml` for Render deployment. It builds the Prisma client, compiles the API, applies migrations, and exposes `/health` as its health check. Configure all secret environment variables in the hosting provider rather than in Git.

The frontend includes `frontend/vercel.json` for a Vercel deployment with SPA rewrites and security response headers. Set `VITE_API_URL` to the deployed backend API URL during the frontend build.

## Security Notes

- Never commit `.env`, `.env.local`, API keys, database credentials, or JWT secrets.
- Use long, unique JWT secrets outside local development.
- Restrict `CORS_ORIGIN` and `FRONTEND_URL` to the deployed frontend origin.
- Keep R2 and email provider credentials in the deployment platform's secret manager.