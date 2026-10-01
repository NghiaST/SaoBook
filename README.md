# SaoBook - An online story reading platform

SaoBook is an online platform for reading and listening to digital stories, designed to provide a comfortable, flexible, and seamless reading experience. The platform allows users to discover stories, read chapters online, manage their personal bookshelves, track reading history, and listen to story content through integrated text-to-speech (TTS) features.

---

## Features

- **Reading:** distraction-free chapter reader with adjustable font, line height, colors and width; table of contents and keyboard navigation (← / →)
- **Text-to-speech:** reads the chapter title and body, click any paragraph to jump, auto-play next chapter, sleep timer, two engines (browser SpeechSynthesis and backend audio) with retry and error handling
- **Library:** bookshelves, reading history, and read-progress tracking
- **Community:** comments and reviews
- **Accounts:** registration, login, email flows, JWT access/refresh tokens
- **Authors and admins:** separate workflows for managing stories, chapters and content

## Live Demo

Try it online: **[web.saobook.app](https://web.saobook.app)**

| Service | Link |
| --- | --- |
| Web app (Vercel) | [https://web.saobook.app](https://web.saobook.app) |
| API health check (Render) | [https://api.saobook.app/health](https://api.saobook.app/health) |

> The API runs on a free instance that sleeps when idle, so the first request after a while can take a few seconds.

## Demo Accounts
 
Use these sample accounts to explore each role on the live demo:
 
| Role | Username | Password | Email |
| --- | --- | --- | --- |
| Admin | `admin` | `123456789` | admin@gmail.com |
| Author | `author` | `123456789` | author@gmail.com |
| User | `user` | `123456789` | user@gmail.com |

## Stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zustand |
| Backend | Node.js, Fastify, TypeScript, Prisma |
| Database | PostgreSQL |
| Storage | S3-compatible object storage (Cloudflare R2) |
| Authentication | JWT access and refresh tokens |
| Email | Resend |
| API docs | Swagger UI (development only) |
| Hosting | Frontend on Vercel, backend on Render |

## Documentation

- [docs/ClassDiagramAndUseCase.md](docs/ClassDiagramAndUseCase.md) - domain model and use-case specification
- [docs/Stack.md](docs/Stack.md) - technology stack summary

## Repository Layout

```text
project-root/
├── README.md
├── docs/
│   ├── ClassDiagramAndUseCase.md
│   └── Stack.md
├── backend/
│   ├── README.md
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── common/
│   │   ├── config/
│   │   ├── modules/
│   │   ├── prisma/
│   │   ├── scripts/
│   │   ├── storage/
│   │   └── main.ts
│   ├── package.json
│   ├── render.yaml
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── router/
│   │   ├── store/
│   │   ├── styles/
│   │   └── types/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── vercel.json
└── .gitignore
```

## Run Locally

**Prerequisites:** Node.js with npm, a PostgreSQL database, an S3-compatible bucket (Cloudflare R2), and a Resend API key.

```bash
# Backend
cd backend
npm install
cp .env.example .env        # fill in the values
npm run db:generate
npm run db:migrate:dev
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend health check | http://localhost:3000/health |
| Swagger UI (development only) | http://localhost:3000/docs |

## Database Workflow

1. Update `backend/prisma/schema.prisma`.
2. Create a development migration with `npm run db:migrate:dev` from `backend/`.
3. Review the generated SQL and schema changes.
4. Commit the migration with the related application changes.
5. Deploy with `npm run db:migrate`.

Do not edit an already-applied migration to change production data. Create a new migration instead.

## Deployment

- **Backend:** `backend/render.yaml` builds the Prisma client, compiles the API, applies migrations, and uses `/health` as the health check.
- **Frontend:** `frontend/vercel.json` configures SPA rewrites and security headers. Set `VITE_API_URL` to the deployed backend API URL at build time.

## Security Notes

- Never commit `.env`, `.env.local`, API keys, database credentials, or JWT secrets.
- Use long, unique JWT secrets outside local development.
- Restrict `CORS_ORIGIN` and `FRONTEND_URL` to the deployed frontend origin.
- Keep R2 and email provider credentials in the deployment platform's secret manager.