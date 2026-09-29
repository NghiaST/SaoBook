# SaoBook Backend API Report

Fastify + Prisma + PostgreSQL backend.

## 1. Run Backend

### Local development

```powershell
cd backend
Copy-Item .env.example .env
# Set DATABASE_URL, DIRECT_URL, JWT, R2, and Resend values in .env
npm install
npm run db:generate
npm run db:migrate:dev
npm run dev
```

Default base URL: `http://localhost:3000`

Swagger UI: `http://localhost:3000/docs` when `NODE_ENV` is not `production`.

### Docker

```powershell
cd backend
docker build -t saobook-backend .
docker run --name saobook-backend --env-file .env -p 3000:3000 saobook-backend
```

The image starts with `npm start`. Run database migrations separately with
`npm run db:migrate` before starting the container when required.

## 2. REST API

Base URL: `http://localhost:3000`

`T` means string, `I` integer, `N` number, `B` boolean, `D` ISO date-time,
`U` URI, and `UUID` string identifier. `?` means optional. `[]` means array.

### Shared Types

The following types are shared across the frontend and backend.

#### Type Notation

| Symbol | Meaning                   |
| ------ | ------------------------- |
| `T`    | `string`                  |
| `I`    | `integer`                 |
| `N`    | `number`                  |
| `B`    | `boolean`                 |
| `D`    | `datetime`                |
| `UUID` | UUID string               |
| `?`    | Optional / nullable field |

#### Common Types

```text
Error
{
  error: T
  message: T
}

TokenResponse
{
  user: User
  accessToken: T
  refreshToken: T
}

User
{
  id: UUID
  username: T
  email: T
  name: T
  bio: T?
  avatarUrl: T?
  role: user | author | admin
  createdAt: D
}

UserSettings
{
  id: UUID
  userId: UUID

  ttsLanguage: vi | en | zh
  ttsVoice: male | female
  ttsSpeed: N
  ttsVolume: N

  autoNextChapter: B
  sleepTimerMinutes: I

  theme: light | dark
  bgColor: T
  textColor: T
  fontFamily: T
  fontSize: I
  lineHeight: N
}

Story
{
  id: I
  nameId: T
  name: T
  posterUrl: T?
  description: T?
  sourceNote: T?

  authorId: UUID
  author: object?

  createdAt: D
  updatedAt: D

  avgRating: N?

  _count: {
    chapters: I
    reviews: I
  }?
}

Chapter
{
  id: I
  name: T
  order: I
  contentUrl: T

  storyId: I

  createdAt: D
  updatedAt: D
}

Comment
{
  id: UUID
  userId: UUID
  storyId: I
  chapterId: I?
  parentCommentId: UUID?

  content: T
  createdAt: D

  user: object
}

Review
{
  id: UUID
  userId: UUID
  storyId: I

  rating: I (1..5)
  content: T?

  createdAt: D

  user: object
}

Key
{
  id: UUID
  userId: UUID?

  label: T
  key: T
  active: B

  createdAt: D
  updatedAt: D
}
```

#### Notes

* `User` and `UserSettings` use `UUID` identifiers.
* `Story` and `Chapter` use integer identifiers.
* `Comment` supports nested replies through `parentCommentId`.
* `Review.rating` must be an integer from `1` to `5`.
* `Story._count` contains optional aggregate counts for chapters and reviews.
* `author`, `user`, and similar nested objects are represented as `object` here and should use dedicated types when their response shape is defined.

### Health

| Method and path | Request parameters | Response |
| --- | --- | --- |
| `GET /health` | None | `200 { status: T, ts: D }` |

### Auth

| Method and path | Request parameters | Response |
| --- | --- | --- |
| `POST /api/auth/register` | Body: `username: T`, `email: T`, `name: T`, `password: T` | `201 TokenResponse`; `409/422 Error` |
| `POST /api/auth/login` | Body: `identifier: T`, `password: T` | `200 TokenResponse`; `401 Error` |
| `POST /api/auth/refresh` | Body: `refreshToken: T` | `200 TokenResponse`; `401 Error` |
| `POST /api/auth/logout` | None | `200 { message: T }` |
| `POST /api/auth/forgot-password` | Body: `email: T` | `200 { message: T }` |
| `POST /api/auth/reset-password` | Body: `token: T`, `newPassword: T` | `200 { message: T }`; `422 Error` |

### Users

| Method and path | Request parameters | Response |
| --- | --- | --- |
| `GET /api/users/me` | None | `200 User` |
| `PATCH /api/users/me` | Body: `name?: T`, `email?: T`, `bio?: T`, `avatarUrl?: T` | `200 User`; `409 Error` |
| `POST /api/users/me/avatar` | Multipart: `file: binary` | `200 User`; `422 Error` |
| `POST /api/users/me/avatar-from-url` | Body: `url: U` | `200 User`; `422 Error` |
| `PATCH /api/users/me/password` | Body: `currentPassword: T`, `newPassword: T` | `200 { message: T }`; `401 Error` |
| `PUT /api/users/me/settings` | Body: `ttsLanguage?: vi|en|zh`, `ttsVoice?: male|female`, `ttsSpeed?: N`, `ttsVolume?: N`, `autoNextChapter?: B`, `sleepTimerMinutes?: I`, `theme?: light|dark`, `bgColor?: T`, `textColor?: T`, `fontFamily?: T`, `fontSize?: I`, `lineHeight?: N` | `200 UserSettings` |
| `GET /api/users/me/comments` | None | `200 Comment[]` |
| `GET /api/users/me/bookshelf` | None | `200 object[]` |
| `GET /api/users/me/history` | None | `200 object[]` |

### Stories

| Method and path | Request parameters | Response |
| --- | --- | --- |
| `GET /api/stories` | Query: `q?: T`, `page?: I`, `limit?: I`, `sort?: newest|rating|popular` | `200 { stories: Story[], total: I, page: I, limit: I }` |
| `GET /api/stories/mine` | None | `200 Story[]` |
| `GET /api/stories/:nameId` | Path: `nameId: T` | `200 Story`; `404 Error` |
| `GET /api/stories/:nameId/chapters` | Path: `nameId: T` | `200 Chapter[]` |
| `POST /api/stories` | Multipart: `name: T`, `nameId: T`, `description?: T`, `sourceNote?: T`, `posterUrl?: U`, `posterFile?: binary` | `201 Story`; `409 Error` |
| `POST /api/stories/:id/poster` | Path: `id: I`; multipart: `posterFile|poster|file: binary` | `200 { posterUrl: T }`; `403/404/422 Error` |
| `POST /api/stories/:id/poster-url` | Path: `id: I`; body: `url: U` | `200 { posterUrl: T }`; `403/404/422 Error` |
| `PATCH /api/stories/:id` | Path: `id: I`; multipart: `name?: T`, `description?: T`, `sourceNote?: T`, `posterUrl?: U`, `posterFile?: binary` | `200 Story`; `403/404 Error` |
| `DELETE /api/stories/:id` | Path: `id: I` | `204`; `403/404 Error` |

### Chapters

| Method and path | Request parameters | Response |
| --- | --- | --- |
| `GET /api/chapters/:id` | Path: `id: I` | `200 Chapter`; `404 Error` |
| `POST /api/stories/:storyId/chapters` | Path: `storyId: I`; body: `name: T`, `content: T`, `order?: I` | `201 Chapter`; `403/404 Error` |
| `POST /api/stories/:storyId/chapters/batch` | Path: `storyId: I`; body: `{ name: T, content: T, order?: I }[]` | `201 Chapter[]`; `403 Error` |
| `PATCH /api/chapters/:id` | Path: `id: I`; body: `name?: T`, `order?: I`, `content?: T` | `200 Chapter`; `403/404 Error` |
| `DELETE /api/chapters/:id` | Path: `id: I` | `204`; `403/404 Error` |
| `POST /api/chapters/:id/read` | Path: `id: I` | `200 { ok: B }`; `404 Error` |

### Comments

| Method and path | Request parameters | Response |
| --- | --- | --- |
| `GET /api/stories/:storyId/comments` | Path: `storyId: I`; query: `chapterId?: I|T` | `200 Comment[]` |
| `POST /api/stories/:storyId/comments` | Path: `storyId: I`; body: `content: T`, `chapterId?: I|T`, `parentCommentId?: UUID` | `201 Comment`; `404 Error` |
| `DELETE /api/comments/:id` | Path: `id: UUID` | `204`; `403/404 Error` |

### Reviews

| Method and path | Request parameters | Response |
| --- | --- | --- |
| `GET /api/stories/:storyId/reviews` | Path: `storyId: I` | `200 Review[]` |
| `PUT /api/stories/:storyId/reviews` | Path: `storyId: I`; body: `rating: I(1..5)`, `content?: T` | `200 Review`; `404/422 Error` |
| `DELETE /api/stories/:storyId/reviews` | Path: `storyId: I` | `204`; `403/404 Error` |

### Bookshelf

| Method and path | Request parameters | Response |
| --- | --- | --- |
| `PUT /api/bookshelf/:storyId` | Path: `storyId: I`; body: `note?: T` | `200 object`; `404 Error` |
| `PATCH /api/bookshelf/:storyId` | Path: `storyId: I`; body: `note?: T` | `200 object`; `404 Error` |
| `DELETE /api/bookshelf/:storyId` | Path: `storyId: I` | `204` |

### Admin

| Method and path | Request parameters | Response |
| --- | --- | --- |
| `GET /api/admin/users` | Query: `q?: T`, `role?: user|author|admin`, `page?: I`, `limit?: I` | `200 { users: object[], total: I, page: I, limit: I }` |
| `PATCH /api/admin/users/:id/role` | Path: `id: UUID`; body: `role: user|author|admin` | `200 object`; `404 Error` |
| `DELETE /api/admin/users/:id` | Path: `id: UUID` | `204`; `404 Error` |
| `GET /api/admin/stats` | None | `200 object` |

### TTS API keys

| Method and path | Request parameters | Response |
| --- | --- | --- |
| `GET /api/tts/keys/active` | None | `200 { keys: T[] }` |
| `GET /api/tts/keys` | None | `200 Key[]` |
| `POST /api/tts/keys` | Body: `label: T`, `key: T` | `201 Key`; `422 Error` |
| `PATCH /api/tts/keys/:id` | Path: `id: UUID`; body: `label?: T`, `key?: T`, `active?: B` | `200 Key`; `403/404 Error` |
| `DELETE /api/tts/keys/:id` | Path: `id: UUID` | `204`; `403/404 Error` |