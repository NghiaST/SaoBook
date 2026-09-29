# Class Diagram & Use Case Specification

This document reflects the current implementation of SaoBook as represented in the Prisma schema and the frontend route structure. It covers the main domain entities, the relationships between them, and the primary user journeys supported by the application.

---

## Domain Model Summary

### User
- `id`: string (UUID)
- `username`: string
- `email`: string
- `name`: string
- `avatarUrl`: string | null
- `bio`: string | null
- `passwordHash`: string
- `role`: enum — `user | author | admin`
- `createdAt`: datetime
- `updatedAt`: datetime
- `settings`: `UserSettings`
- `stories`: authored stories
- `comments`: comments written by the user
- `reviews`: reviews written by the user
- `bookshelves`: saved stories
- `readingHistories`: per-story reading state
- `chapterReadLogs`: completed chapter history
- `rvApiKeys`: ResponsiveVoice API keys for the user

### UserSettings
- `id`: string (UUID)
- `userId`: string (FK → User)
- `ttsLanguage`: enum — `vi | en | zh`
- `ttsVoice`: enum — `male | female`
- `ttsSpeed`: float (default `1.0`)
- `ttsVolume`: float (default `1.0`)
- `autoNextChapter`: boolean
- `sleepTimerMinutes`: integer
- `theme`: enum — `light | dark`
- `bgColor`: string
- `textColor`: string
- `fontFamily`: string
- `fontSize`: integer
- `lineHeight`: float

### PasswordReset
- `id`: string (UUID)
- `userId`: string (FK → User)
- `token`: string
- `expiresAt`: datetime
- `usedAt`: datetime | null
- `createdAt`: datetime

### Story
- `id`: integer
- `nameId`: string (slug / unique URI key)
- `name`: string
- `posterUrl`: string | null
- `description`: string | null
- `sourceNote`: string | null
- `authorId`: string (FK → User)
- `createdAt`: datetime
- `updatedAt`: datetime
- `chapters`: list of chapters in the story
- `comments`: story-level and chapter-level comments
- `reviews`: ratings and notes
- `bookshelves`: saved by readers
- `readingHistories`: reading-tracking records
- `chapterReadLogs`: chapter completion markers

### Chapter
- `id`: integer
- `name`: string
- `order`: integer
- `contentUrl`: string (stored in Cloudflare R2 or other object storage)
- `storyId`: integer (FK → Story)
- `createdAt`: datetime
- `updatedAt`: datetime
- `comments`: comments tied to this chapter
- `readingHistories`: last-read state
- `chapterReadLogs`: per-chapter completion logs

### Comment
- `id`: string (UUID)
- `userId`: string (FK → User)
- `storyId`: integer (FK → Story)
- `chapterId`: integer | null
- `parentCommentId`: string | null
- `content`: string
- `createdAt`: datetime
- `updatedAt`: datetime
- `replies`: threaded responses to a parent comment

### Review
- `id`: string (UUID)
- `userId`: string (FK → User)
- `storyId`: integer (FK → Story)
- `rating`: integer (1–5)
- `content`: string | null
- `createdAt`: datetime
- `updatedAt`: datetime

### Bookshelf
- `id`: string (UUID)
- `userId`: string (FK → User)
- `storyId`: integer (FK → Story)
- `note`: string | null
- `savedAt`: datetime

### ReadingHistory
- `id`: string (UUID)
- `userId`: string (FK → User)
- `storyId`: integer (FK → Story)
- `lastChapterId`: integer (FK → Chapter)
- `lastReadAt`: datetime

### ChapterReadLog
- `id`: string (UUID)
- `userId`: string (FK → User)
- `chapterId`: integer (FK → Chapter)
- `storyId`: integer (FK → Story)
- `readAt`: datetime

### RvApiKey
- `id`: string (UUID)
- `userId`: string | null (FK → User)
- `label`: string
- `key`: string
- `active`: boolean
- `createdAt`: datetime
- `updatedAt`: datetime

---

## Core Relationships

- `User` 1 → 1 `UserSettings`
- `User` 1 → 0..* `PasswordReset`
- `User` 1 → 0..* `Story` (as author)
- `Story` 1 → 0..* `Chapter`
- `User` 1 → 0..* `Comment`
- `Story` 1 → 0..* `Comment`
- `Chapter` 0..1 → 0..* `Comment`
- `Comment` 0..1 → 0..* `Comment` (threaded replies)
- `User` 1 → 0..* `Review`
- `Story` 1 → 0..* `Review`
- `User` 1 → 0..* `Bookshelf`
- `Story` 1 → 0..* `Bookshelf`
- `User` 1 → 0..* `ReadingHistory`
- `Story` 1 → 0..* `ReadingHistory`
- `User` 1 → 0..* `ChapterReadLog`
- `Chapter` 1 → 0..* `ChapterReadLog`
- `User` 1 → 0..* `RvApiKey`

---

## Actors

- **Guest** — anonymous visitor
- **User** — logged-in reader
- **Author** — user with `author` role; inherits standard user flows and can manage stories and chapters
- **Admin** — user with `admin` role; manages content and application operations

---

## Use Case Specifications

### UC-01: Register

| Field | Detail |
|---|---|
| Use case ID | UC-01 |
| Name | Register |
| Actor | Guest |
| Precondition | User is not authenticated |
| Postcondition | Account is created and the user is logged in |

Main flow:
1. Guest opens the registration page.
2. Guest enters username, email, and password.
3. System validates uniqueness and required fields.
4. System hashes the password and persists the `User` record.
5. System creates the default `UserSettings` profile.
6. System authenticates the user and redirects them to the app.

Alternate flow:
- 3a. Username or email is already taken → system shows a validation error and requests corrections.

---

### UC-02: Login

| Field | Detail |
|---|---|
| Use case ID | UC-02 |
| Name | Login |
| Actor | Guest |
| Precondition | User has an existing account |
| Postcondition | User receives a valid session/token |

Main flow:
1. User enters username/email and password.
2. System verifies credentials against the stored hash.
3. System issues access and refresh tokens.
4. System redirects the user to the homepage or app dashboard.

Alternate flow:
- 2a. Invalid credentials → system shows a neutral generic error message.

---

### UC-03: Reset Password

| Field | Detail |
|---|---|
| Use case ID | UC-03 |
| Name | Account recovery |
| Actor | Guest |
| Precondition | User has a registered email |
| Postcondition | User resets the password and can log in again |

Main flow:
1. User requests a password reset from the login page.
2. System validates the email and creates a time-bound token.
3. System sends a reset link by email.
4. User submits a new password.
5. System stores the new hash, invalidates old reset tokens, and redirects the user to login.

Alternate flow:
- 3a. Email is not found → system responds with a neutral confirmation instead of exposing account existence.

---

### UC-04: Manage Profile and Preferences

| Field | Detail |
|---|---|
| Use case ID | UC-04 |
| Name | Manage profile |
| Actor | User |
| Precondition | User is logged in |
| Postcondition | Profile or settings are updated |

Main flow:
1. User opens the profile or settings page.
2. User updates any of the following: name, bio, avatar, email, password, TTS settings, UI theme, fonts, colors, and reading behavior.
3. System validates changed values and saves them to the database.
4. System confirms the update and refreshes UI state.

Alternate flow:
- 2a. Email is already taken → system displays validation feedback.
- 2b. Current password is incorrect when changing password → update is rejected and user is prompted again.

---

### UC-05: Browse and Search Stories

| Field | Detail |
|---|---|
| Use case ID | UC-05 |
| Name | Search and filter stories |
| Actor | Guest, User |
| Precondition | None |
| Postcondition | Story list matches the requested filters |

Main flow:
1. User enters a keyword or opens a browse screen.
2. User applies filters such as search text, sort order, or story metadata.
3. System queries the story dataset and returns matching results.
4. User selects a story to open its detail screen.

Alternate flow:
- 3a. No stories match → system displays an empty state with clear recovery options.

---

### UC-06: Read Story and Track Progress

| Field | Detail |
|---|---|
| Use case ID | UC-06 |
| Name | Read story |
| Actor | User |
| Precondition | User has access to the story |
| Postcondition | Chapter progress is maintained and history is updated |

Main flow:
1. User opens a story page.
2. User selects a chapter to read.
3. System loads the chapter content from object storage.
4. User reads the chapter and advances through pages or chapters.
5. System updates `ReadingHistory` and appends a `ChapterReadLog` entry for completed chapters.

Alternate flow:
- 2a. User stops mid-chapter → the app keeps the latest reading state and resumes from the last known point.

---

### UC-07: Manage Bookshelf and Reading State

| Field | Detail |
|---|---|
| Use case ID | UC-07 |
| Name | Save story to bookshelf |
| Actor | User |
| Precondition | User is authenticated |
| Postcondition | Story is saved or removed from saved list |

Main flow:
1. User opens a story detail page.
2. User saves or removes the story from their bookshelf.
3. Application writes or deletes the `Bookshelf` record.
4. User can revisit saved stories from the bookshelf page.

Alternate flow:
- 2a. Story is already saved → the action toggles the saved state instead of creating duplicates.

---

### UC-08: Comment and Review

| Field | Detail |
|---|---|
| Use case ID | UC-08 |
| Name | Comment and review story |
| Actor | User |
| Precondition | User is authenticated |
| Postcondition | Comment or review is created and stored |

Main flow:
1. User writes a comment on a story or chapter.
2. User may reply to an existing thread.
3. System validates the content and creates a `Comment` record.
4. User can also submit a review with a rating and optional note.
5. System stores one review per user per story.

Alternate flow:
- 1a. Comment is empty or invalid → system rejects it and asks user to revise it.

---

### UC-09: Author Story and Chapter Management

| Field | Detail |
|---|---|
| Use case ID | UC-09 |
| Name | Create and manage story content |
| Actor | Author |
| Precondition | Actor has `author` privileges |
| Postcondition | Story or chapter is published or updated |

Main flow:
1. Author opens the story management screen.
2. Author creates or edits a story, including metadata and poster information.
3. Author adds or updates chapter records and uploads chapter content to storage.
4. System persists the chapter metadata and links it to the parent story.
5. Story becomes available to readers through the public listing.

Alternate flow:
- 2a. Story slug is duplicated → system prompts for a unique `nameId`.

---

### UC-10: TTS Playback Controls

| Field | Detail |
|---|---|
| Use case ID | UC-10 |
| Name | Listen with TTS |
| Actor | User |
| Precondition | User is reading a story |
| Postcondition | Content is played with the selected voice, speed, and volume settings |

Main flow:
1. User opens the reading screen.
2. User selects a language, voice, speed, and volume from settings.
3. System reads the chapter content through the configured TTS engine.
4. User can continue to the next chapter automatically or set a sleep timer.

Alternate flow:
- 3a. TTS service is unavailable → the app surfaces a user-visible error and keeps the chapter available for normal reading.

---

### UC-11: Admin Moderation and Operations

| Field | Detail |
|---|---|
| Use case ID | UC-11 |
| Name | Admin dashboard operations |
| Actor | Admin |
| Precondition | Actor has admin role |
| Postcondition | Administrative actions are applied |

Main flow:
1. Admin opens the admin dashboard.
2. Admin inspects protected content, users, and story data.
3. Admin performs moderation or operational tasks such as reviewing data quality or managing user actions.
4. System applies the action and records the result in the proper admin workflow.

---

## Implementation Notes

- `contentUrl` for chapters is intentionally stored outside the relational database, with the database holding metadata and links only.
- `UserSettings` encapsulates both reading and visual preferences and is created for every new user.
- The current model supports both story-level and chapter-level comments, as well as user-specific reading history and chapter completion tracking.
- ResponsiveVoice keys are stored as user-bound secrets through `RvApiKey`, enabling per-user TTS configuration without sharing a global key.

---

## System Boundary

The app is organized around a clear separation between:
- user-facing presentation and interaction in the frontend,
- auth and application logic in the backend API,
- persistence and schemas in Prisma/PostgreSQL,
- file content storage in Cloudflare R2 or an equivalent S3-compatible bucket.

This structure supports story reading, author workflows, personalized reading settings, comments and reviews, and admin operations without merging business logic into the frontend.
|---|---|
| **Use case ID** | UC-06 |
| **Use case name** | Read story |
| **Actor** | Guest, User |
| **Precondition** | Story and at least one chapter exist |
| **Postcondition** | Chapter content is displayed; reading history is updated (User only) |

**Main flow**
1. Actor opens a story detail page and selects a chapter.
2. System fetches the chapter content from data storage via `content_url`.
3. System renders the chapter content with the user's UI settings (theme, font, etc.).
4. If the actor is a logged-in User, system upserts a `ReadingHistory` record and appends a `ChapterReadLog` entry.
5. Actor navigates to the next/previous chapter using navigation controls.

**Alternative flow — content unavailable**
- 2a. Data storage returns an error → system shows an error message; reading history is not updated.

---

### UC-07: Listen (Text-to-Speech)

| Field | Detail |
|---|---|
| **Use case ID** | UC-07 |
| **Use case name** | Listen (TTS) |
| **Actor** | User |
| **Precondition** | User is on a chapter reading page; TTS settings are configured |
| **Postcondition** | Chapter content is read aloud according to TTS settings |

**Main flow**
1. User clicks the play button on the reading page.
2. System reads TTS settings: language, voice, speed, volume.
3. System synthesizes and streams audio for the current chapter text.
4. User can pause, resume, adjust speed/volume, or stop at any time.
5. If `auto_next_chapter` is enabled, system automatically moves to the next chapter when audio finishes.
6. If `sleep_timer_minutes` is set, system stops playback after the specified duration.

**Alternative flow — TTS unavailable**
- 3a. TTS service is unreachable → system shows an error toast; text content remains readable.

---

### UC-08: Settings (TTS + Reading UI)

| Field | Detail |
|---|---|
| **Use case ID** | UC-08 |
| **Use case name** | Settings |
| **Actor** | User |
| **Precondition** | User is logged in |
| **Postcondition** | UserSettings are persisted and applied immediately |

**Main flow**
1. User opens settings (either via the global settings page or the in-reader panel).
2. User adjusts TTS settings: language, voice gender, speed (0.5–5, step 0.1), volume, auto-next chapter, sleep timer.
3. User adjusts UI settings: theme (light/dark), background color, text color, font family, font size, line height.
4. Changes are previewed in real time.
5. User saves; system persists the updated `UserSettings` record.

---

### UC-09: Comment

| Field | Detail |
|---|---|
| **Use case ID** | UC-09 |
| **Use case name** | Comment |
| **Actor** | User |
| **Precondition** | User is logged in; story (and optionally chapter) exists |
| **Postcondition** | Comment is saved and displayed in the comment thread |

**Main flow**
1. User navigates to the comment section of a story or chapter.
2. User types a comment in the text input.
3. To reply to an existing comment, user clicks "Reply" on that comment; `parent_comment_id` is set.
4. User submits the comment.
5. System saves the `Comment` record and refreshes the thread.

**Alternative flow — empty content**
- 4a. Comment text is empty → system prevents submission and shows a validation message.

---

### UC-10: Review (Rating)

| Field | Detail |
|---|---|
| **Use case ID** | UC-10 |
| **Use case name** | Review (rating) |
| **Actor** | User |
| **Precondition** | User is logged in; story exists; user has not already reviewed this story |
| **Postcondition** | Review is saved; story's average rating is updated |

**Main flow**
1. User opens a story's detail page and clicks "Write a review."
2. User selects a star rating (1–5) and optionally writes a text review.
3. User submits the review.
4. System saves the `Review` record and recalculates the story's average rating.

**Alternative flow — already reviewed**
- 1a. User has an existing review for this story → system loads the existing review for editing instead of creating a new one.

---

### UC-11: Show My Comments

| Field | Detail |
|---|---|
| **Use case ID** | UC-11 |
| **Use case name** | Show my comments |
| **Actor** | User |
| **Precondition** | User is logged in |
| **Postcondition** | A list of the user's comments is displayed |

**Main flow**
1. User navigates to "My comments" in their profile menu.
2. System retrieves all `Comment` records where `user_id` matches the current user, ordered by `created_at` descending.
3. System displays each comment with: story title, chapter name (if applicable), comment content, and timestamp.
4. User can click a comment to navigate directly to its context (story/chapter).

---

### UC-12: Add Story

| Field | Detail |
|---|---|
| **Use case ID** | UC-12 |
| **Use case name** | Add story |
| **Actor** | Author |
| **Precondition** | User is logged in with role `author` or `admin` |
| **Postcondition** | New Story record is created |

**Main flow**
1. Author navigates to "Add story."
2. Author fills in: title, slug (`name_id`), description, poster image, source note.
3. System validates that `name_id` is unique.
4. System saves the `Story` record with `author_id` set to the current user.
5. System redirects to the story management page.

**Alternative flow — duplicate slug**
- 3a. `name_id` already exists → system shows an error and suggests an alternative slug.

---

### UC-13: Add Chapter

| Field | Detail |
|---|---|
| **Use case ID** | UC-13 |
| **Use case name** | Add chapter |
| **Actor** | Author |
| **Precondition** | Author owns the story; user is logged in |
| **Postcondition** | One or more Chapter records are created; content is uploaded to data storage |

**Main flow**
1. Author navigates to the story's chapter management page and clicks "Add chapter."
2. Author chooses input method: manual text entry or file upload (single or batch).
3. For file upload: system parses the file(s) and extracts chapter name and content.
4. System uploads chapter content to data storage and saves the `content_url`.
5. System creates the `Chapter` record(s) with auto-incremented `order`.

**Alternative flow — file parse error**
- 3a. File format is unsupported or malformed → system shows an error for the affected file; valid files proceed.

---

### UC-14: Edit Chapter

| Field | Detail |
|---|---|
| **Use case ID** | UC-14 |
| **Use case name** | Edit chapter |
| **Actor** | Author |
| **Precondition** | Author owns the story; chapter exists |
| **Postcondition** | Chapter record and/or content is updated |

**Main flow**
1. Author opens the chapter list and clicks "Edit" on a chapter.
2. Author modifies the chapter name, order, and/or content.
3. If content is changed, system uploads the new content to data storage and updates `content_url`.
4. System saves the updated `Chapter` record.

---

### UC-15: Delete Chapter

| Field | Detail |
|---|---|
| **Use case ID** | UC-15 |
| **Use case name** | Delete chapter |
| **Actor** | Author |
| **Precondition** | Author owns the story; chapter exists |
| **Postcondition** | Chapter is removed; content is deleted from data storage |

**Main flow**
1. Author clicks "Delete" on a chapter.
2. System shows a confirmation dialog.
3. Author confirms.
4. System deletes the `Chapter` record, removes the content from data storage, and re-indexes remaining chapter orders.

**Alternative flow — cancel**
- 3a. Author cancels → no changes are made.

---

### UC-16: Delete Story

| Field | Detail |
|---|---|
| **Use case ID** | UC-16 |
| **Use case name** | Delete story |
| **Actor** | Author, Admin |
| **Precondition** | Actor owns the story (Author) or has admin role |
| **Postcondition** | Story and all associated chapters, comments, and reviews are removed |

**Main flow**
1. Actor clicks "Delete" on a story.
2. System shows a confirmation dialog listing what will be deleted.
3. Actor confirms.
4. System deletes all `Chapter` records and their data storage content, then deletes the `Story` record (cascades to `Comment`, `Review`, `Bookshelf`, `ReadingHistory`, `ChapterReadLog`).

**Alternative flow — cancel**
- 3a. Actor cancels → no changes are made.

---

### UC-17: Show My Stories (Author)

| Field | Detail |
|---|---|
| **Use case ID** | UC-17 |
| **Use case name** | Show my stories |
| **Actor** | Author |
| **Precondition** | User is logged in with role `author` or `admin` |
| **Postcondition** | Author's story list is displayed with management options |

**Main flow**
1. Author navigates to "My stories."
2. System retrieves all `Story` records where `author_id` matches the current user.
3. System displays each story with: title, poster, chapter count, latest update, average rating.
4. Author can click a story to manage its chapters, or use inline actions to edit/delete.

---

### UC-18: Admin — User Management

| Field | Detail |
|---|---|
| **Use case ID** | UC-18 |
| **Use case name** | Admin user management |
| **Actor** | Admin |
| **Precondition** | User is logged in with role `admin` |
| **Postcondition** | User records are updated as required |

**Main flow**
1. Admin navigates to the user management panel.
2. System lists all users with: username, email, role, registration date, status.
3. Admin can search/filter users by username, email, or role.
4. Admin can perform actions on a selected user:
   - Change role (`user ↔ author ↔ admin`)
   - Reset password (sends a recovery email)
   - Delete account (with cascade confirmation)
5. System applies the action and logs it.

---

### UC-19: Admin — View Statistics

| Field | Detail |
|---|---|
| **Use case ID** | UC-19 |
| **Use case name** | Admin view statistics |
| **Actor** | Admin |
| **Precondition** | User is logged in with role `admin` |
| **Postcondition** | Statistics dashboard is displayed |

**Main flow**
1. Admin navigates to the statistics/dashboard page.
2. System aggregates and displays:
   - **User stats**: total users, new registrations over time, active users (by reading activity)
   - **Reading stats**: total chapter reads, reads per day/week/month, most-read stories
   - **Top stories**: ranked by reads, rating, bookshelf saves, and comment count
   - **Content stats**: total stories, total chapters, new stories/chapters over time
   - **Engagement stats**: total comments, total reviews, average rating distribution
3. Admin can filter stats by date range.
4. Admin can export a summary report.