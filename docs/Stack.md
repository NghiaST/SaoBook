# Stack Overview

SaoBook is built as a full-stack application with a React frontend, a Fastify backend, and PostgreSQL-backed persistence.

## Frontend
- React 18 + TypeScript
- Vite for the build and dev server
- Tailwind CSS for styling
- React Router for route navigation
- TanStack Query + Axios for API access
- Zustand for client-side state management

## Backend
- Node.js + Fastify + TypeScript
- Prisma ORM with PostgreSQL
- JWT-based access and refresh authentication
- Swagger/OpenAPI documentation in development
- Resend for transactional email flows

## Storage and Media
- Cloudflare R2 / S3-compatible object storage for chapter content and uploaded assets
- Public URL support for served media content

## TTS and Voice Features
- User-specific TTS settings for language, voice, speed, volume, auto-next-chapter, and sleep timer
- ResponsiveVoice integration with per-user API keys

## Deployment
- Render for the backend service
- Vercel for the frontend app
- Environment-based secret management for DB, auth, storage, and email configuration

## Notes
- The architecture keeps frontend presentation separate from backend business logic.
- Prisma handles relational data and migrations, while object storage handles large story content and media files.
- The project is designed to support story reading, author workflows, bookmarking, comments, reviews, and admin operations in one platform.