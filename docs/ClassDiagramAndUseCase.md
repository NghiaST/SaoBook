# Class Diagram & Use Case Specification

This document reflects the current implementation of SaoBook as represented in the Prisma schema, backend API, and frontend route structure. It covers persisted domain entities, computed API projections, relationships, and the primary user journeys supported by the application.

## Domain Model Summary

### User
- `id`: string (UUID)
- `username`, `email`, `name`: string
- `avatarUrl`, `bio`: string | null
- `passwordHash`: string
- `role`: `user | author | admin`
- `createdAt`, `updatedAt`: datetime
- `settings`: `UserSettings`
- `stories`, `comments`, `reviews`, `bookshelves`, `readingHistories`, `chapterReadLogs`: related records

### UserSettings
- `id`: string (UUID)
- `userId`: string (FK -> User)
- `ttsLanguage`: `vi | en | zh`
- `ttsVoice`: `male | female`
- `ttsSpeed`: float (default `1.0`)
- `autoNextChapter`: boolean
- `selectedRvApiKeyId`: string (UUID) | null (FK -> `RvApiKey`)
- `rvApiKeys`: related `RvApiKey[]`
- `selectedRvApiKey`: selected `RvApiKey` | null

Reader UI preferences such as theme, colors, font family, font size, and line height are kept in frontend memory and are not persisted in this table.

### PasswordReset
- `id`: string (UUID)
- `userId`: string (FK -> User)
- `token`: string
- `expiresAt`: datetime
- `usedAt`: datetime | null
- `createdAt`: datetime

### Story
- `id`: integer
- `nameId`: unique string slug
- `name`, `posterUrl`, `description`, `sourceNote`: string values, nullable where applicable
- `authorId`: string (FK -> User)
- `createdAt`, `updatedAt`: datetime
- `avgRating`: number | null, computed API aggregate
- `_count`: optional computed API counts for chapters and reviews
- `chapters`, `comments`, `reviews`, `bookshelves`, `readingHistories`, `chapterReadLogs`: related records

### Chapter
- `id`: integer
- `name`: string
- `order`: integer, unique within a story
- `contentUrl`: string stored in Cloudflare R2 or compatible object storage
- `storyId`: integer (FK -> Story)
- `createdAt`, `updatedAt`: datetime

### Comment
- `id`: string (UUID)
- `userId`, `storyId`: foreign keys
- `chapterId`, `parentCommentId`: integer/string | null
- `content`: string
- `createdAt`, `updatedAt`: datetime
- `replies`: threaded child comments

### Review
- `id`: string (UUID)
- `userId`, `storyId`: foreign keys
- `rating`: integer (1-5)
- `content`: string | null
- `createdAt`, `updatedAt`: datetime

### Bookshelf
- `id`: string (UUID)
- `userId`, `storyId`: foreign keys
- `note`: string | null
- `savedAt`: datetime

### ReadingHistory
- `id`: string (UUID)
- `userId`, `storyId`, `lastChapterId`: foreign keys
- `lastReadAt`: datetime

### ChapterReadLog
- `id`: string (UUID)
- `userId`, `chapterId`, `storyId`: foreign keys
- `readAt`: datetime

### RvApiKey
- `id`: string (UUID)
- `userSettingsId`: string | null (FK -> UserSettings; null means an admin-managed global key)
- `label`, `key`: string
- `secret`: string | null (server-side ResponsiveVoice v2 credential)
- `status`: `personal | public | hidden`
- `createdAt`, `updatedAt`: datetime

## Core Relationships

- `User` 1 -> 1 `UserSettings`
- `UserSettings` 1 -> 0..* `RvApiKey`
- `UserSettings` 0..1 -> 1 `RvApiKey` through `selectedRvApiKeyId`
- `User` 1 -> 0..* `PasswordReset`, `Story`, `Comment`, `Review`, `Bookshelf`, `ReadingHistory`, `ChapterReadLog`
- `Story` 1 -> 0..* `Chapter`, `Comment`, `Review`, `Bookshelf`, `ReadingHistory`, `ChapterReadLog`
- `Chapter` 0..1 -> 0..* `Comment`, `ReadingHistory`, `ChapterReadLog`
- `Comment` 0..1 -> 0..* `Comment` through threaded replies

## Actors

- **Guest**: anonymous visitor
- **User**: authenticated reader
- **Author**: user with `author` role; can manage stories and chapters
- **Admin**: user with `admin` role; manages users, operations, and global TTS keys

## Use-Case Actor Summary

| Use case ID | Use case | Actors |
|---|---|---|
| **UC-01** | Register | Guest |
| **UC-02** | Login | Guest |
| **UC-03** | Reset Password | Guest |
| **UC-04** | Manage Profile | User |
| **UC-05** | Browse and Search Stories | Guest, User |
| **UC-06** | Read Story and Track Progress | Guest, User |
| **UC-07** | Manage Bookshelf and Reading State | User |
| **UC-08** | Comment and Review | User |
| **UC-09** | Author Story and Chapter Management | Author, Admin |
| **UC-10** | TTS Playback Controls | User |
| **UC-11** | Manage ResponsiveVoice Keys | User, Admin |
| **UC-12** | Customize Reader Settings | User |
| **UC-13** | Admin User Administration and Statistics | Admin |

## Use Case Specifications

### UC-01: Register
| Field | Value |
|---|---|
| **Use case ID** | UC-01 |
| **Name** | Register |
| **Actor** | Guest |
| **Precondition** | User is not authenticated |
| **Postcondition** | `User` and default `UserSettings` are created; user is authenticated |
| **Main flow** | 1. Submit username, email, name, and password.<br>2. Validate fields and uniqueness.<br>3. Hash password and create records.<br>4. Set HttpOnly refresh cookie and return access token. |
| **Alternate flow** | Duplicate username/email returns a conflict. |

### UC-02: Login
| Field | Value |
|---|---|
| **Use case ID** | UC-02 |
| **Name** | Login |
| **Actor** | Guest |
| **Precondition** | Account exists |
| **Postcondition** | Authenticated session is available |
| **Main flow** | 1. Submit username/email and password.<br>2. Verify password.<br>3. Return short-lived access token.<br>4. Rotate HttpOnly refresh cookie. |
| **Alternate flow** | Invalid credentials return a neutral unauthorized response. |

### UC-03: Reset Password
| Field | Value |
|---|---|
| **Use case ID** | UC-03 |
| **Name** | Reset Password |
| **Actor** | Guest |
| **Precondition** | Registered email is available |
| **Postcondition** | Password is replaced and user can log in |
| **Main flow** | 1. Request reset email.<br>2. Create time-bound token and send link.<br>3. Submit token and new password.<br>4. Hash password and invalidate used tokens. |
| **Alternate flow** | Unknown email receives a neutral response. |

### UC-04: Manage Profile
| Field | Value |
|---|---|
| **Use case ID** | UC-04 |
| **Name** | Manage Profile |
| **Actor** | User |
| **Precondition** | User is authenticated |
| **Postcondition** | Profile fields are updated |
| **Main flow** | 1. Edit name, bio, avatar, email, or password.<br>2. Validate changed values.<br>3. Save and return the complete profile projection. |
| **Alternate flow** | Duplicate email or incorrect current password rejects the update. |

### UC-05: Browse and Search Stories
| Field | Value |
|---|---|
| **Use case ID** | UC-05 |
| **Name** | Browse and Search Stories |
| **Actor** | Guest, User |
| **Precondition** | None |
| **Postcondition** | Matching story results are displayed |
| **Main flow** | 1. Submit search text, page, page size, and sort.<br>2. Query story dataset.<br>3. Display results.<br>4. Open selected story detail. |
| **Alternate flow** | No matches display an empty state. |

### UC-06: Read Story and Track Progress
| Field | Value |
|---|---|
| **Use case ID** | UC-06 |
| **Name** | Read Story and Track Progress |
| **Actor** | Guest, User |
| **Precondition** | Story has at least one chapter |
| **Postcondition** | Content is displayed; completed chapters update User history |
| **Main flow** | 1. Open story and select chapter.<br>2. Load content from object storage.<br>3. Read and navigate chapters.<br>4. When final paragraph is visible, update `ReadingHistory` and `ChapterReadLog`. |
| **Alternate flow** | Stopping before the final paragraph does not mark completion; storage failure leaves history unchanged. |

### UC-07: Manage Bookshelf and Reading State
| Field | Value |
|---|---|
| **Use case ID** | UC-07 |
| **Name** | Manage Bookshelf and Reading State |
| **Actor** | User |
| **Precondition** | User is authenticated |
| **Postcondition** | Story is saved or removed |
| **Main flow** | 1. Open story detail.<br>2. Save or remove story.<br>3. Backend upserts or deletes `Bookshelf` record.<br>4. Open saved stories from bookshelf. |
| **Alternate flow** | Existing save toggles instead of creating a duplicate. |

### UC-08: Comment and Review
| Field | Value |
|---|---|
| **Use case ID** | UC-08 |
| **Name** | Comment and Review |
| **Actor** | User |
| **Precondition** | User is authenticated |
| **Postcondition** | Comment or one-per-story review is stored |
| **Main flow** | 1. Create story/chapter comment or reply.<br>2. Validate ownership context.<br>3. Submit optional 1-5 review.<br>4. Refresh thread and rating data. |
| **Alternate flow** | Blank comments, invalid chapters, and cross-story replies are rejected. |

### UC-09: Author Story and Chapter Management
| Field | Value |
|---|---|
| **Use case ID** | UC-09 |
| **Name** | Author Story and Chapter Management |
| **Actor** | Author, Admin |
| **Precondition** | Actor has author/admin role |
| **Postcondition** | Story or chapter is created, updated, or deleted |
| **Main flow** | 1. Create/edit story metadata and poster.<br>2. Add/update/delete chapters and content.<br>3. Store content in object storage.<br>4. Reindex chapters after deletion. |
| **Alternate flow** | Duplicate slugs are rejected; failed batch uploads clean up created rows and files. |

### UC-10: TTS Playback Controls
| Field | Value |
|---|---|
| **Use case ID** | UC-10 |
| **Name** | TTS Playback Controls |
| **Actor** | User |
| **Precondition** | User is reading a chapter |
| **Postcondition** | Chapter text is played with selected controls |
| **Main flow** | 1. Select language and voice.<br>2. Select or store a ResponsiveVoice key when using backend playback.<br>3. Request `/api/tts/audio`; the backend streams ResponsiveVoice v2 audio.<br>4. Pause, resume, stop, auto-next, or use sleep timer. |
| **Alternate flow** | TTS failure leaves normal chapter reading available; hidden or unauthorized keys are rejected. Backend synthesis forwards only text, language, and voice. |

### UC-11: Manage ResponsiveVoice Keys
| Field | Value |
|---|---|
| **Use case ID** | UC-11 |
| **Name** | Manage ResponsiveVoice Keys |
| **Actor** | User, Admin |
| **Precondition** | Actor is authenticated |
| **Postcondition** | Keys are managed with correct visibility and a user's selected key is persisted. |
| **Main flow** | 1. List available keys.<br>2. User manages own keys and selects one through `UserSettings.selectedRvApiKeyId`.<br>3. Admin creates/manages global keys.<br>4. Admin dashboard supports creation, editing, hiding, and deletion. |
| **Alternate flow** | A selected key must be public or personally owned; hidden, invalid, or unauthorized selections return validation errors. |

### UC-12: Customize Reader Settings
| Field | Value |
|---|---|
| **Use case ID** | UC-12 |
| **Name** | Customize Reader Settings |
| **Actor** | User |
| **Precondition** | User is authenticated |
| **Postcondition** | Reader preferences apply immediately; supported TTS fields are saved |
| **Main flow** | 1. Switch light/dark theme.<br>2. Customize per-theme colors, font, text size, line height, and reader width.<br>3. Preview changes.<br>4. Save supported TTS fields through `UserSettings`. |
| **Alternate flow** | Reset restores defaults; preferences reset when the memory-only store is cleared. |

### UC-13: Admin User Administration and Statistics
| Field | Value |
|---|---|
| **Use case ID** | UC-13 |
| **Name** | Admin User Administration and Statistics |
| **Actor** | Admin |
| **Precondition** | Actor has admin role |
| **Postcondition** | User administration or statistics are completed |
| **Main flow** | 1. List/filter users.<br>2. Change roles or delete users.<br>3. View aggregate statistics.<br>4. Manage ResponsiveVoice keys. |
| **Alternate flow** | Non-admin access is rejected; missing users return not-found responses. |

## Implementation Notes

- Chapter text and images are stored in S3-compatible object storage; relational tables store metadata and URLs.
- `UserSettings` stores server-backed TTS preferences and is created for every new user.
- `UserSettings.selectedRvApiKeyId` identifies the key used for backend ResponsiveVoice v2 synthesis; unset selection falls back to the oldest eligible key.
- Reader UI preferences are memory-only; theme-specific colors are retained while the frontend session is alive.
- Access tokens are kept in frontend memory. Refresh tokens are HttpOnly cookies scoped to `/api/auth`.
- `RvApiKey` ownership is through `UserSettings`; nullable ownership supports admin-managed global keys.
- ResponsiveVoice v2 voice discovery uses `GET /api/tts/voices`; audio uses `POST /api/tts/audio` and provider credentials never reach the frontend.
- Story rating averages and `_count` values are computed API projections, not persisted columns.

## System Boundary

The frontend owns presentation, local reader state, and interaction. The backend owns authentication, authorization, validation, application workflows, and API projections. Prisma/PostgreSQL owns relational persistence, while Cloudflare R2 or compatible object storage owns chapter and image content.