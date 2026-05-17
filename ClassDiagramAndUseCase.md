# Class Diagram & Use Case Specification

---

## Class Diagram

### User
- `id`: UUID
- `username`: string
- `email`: string
- `name`: string
- `avatar_url`: string
- `bio`: string (mô tả bản thân)
- `password_hash`: string
- `role`: enum — `user | author | admin`
- `settings`: UserSettings
- `created_at`: datetime

### UserSettings
- `tts`: TTSSettings
- `ui`: UISettings

### TTSSettings
- `language`: enum — `vi | en | zh`
- `voice`: enum — `male | female`
- `speed`: float (0.5–5, step 0.1)
- `volume`: float
- `auto_next_chapter`: bool
- `sleep_timer_minutes`: int

### UISettings
- `theme`: enum — `light | dark`
- `bg_color`: string
- `text_color`: string
- `font_family`: string
- `font_size`: int
- `line_height`: float

### Story
- `id`: UUID
- `name_id`: string (slug)
- `name`: string
- `poster_url`: string
- `description`: string
- `source_note`: string
- `author_id`: UUID (FK → User)
- `created_at`: datetime
- `updated_at`: datetime

### Chapter
- `id`: UUID
- `name`: string
- `order`: int
- `content_url`: string (content stored in data storage, not DB)
- `story_id`: UUID (FK → Story)
- `created_at`: datetime

### Comment
- `id`: UUID
- `user_id`: UUID (FK → User)
- `story_id`: UUID (FK → Story)
- `chapter_id`: UUID (FK → Chapter, nullable — null means story-level comment)
- `parent_comment_id`: UUID (FK → Comment, nullable — null means top-level)
- `content`: string
- `created_at`: datetime

### Review
- `id`: UUID
- `user_id`: UUID (FK → User)
- `story_id`: UUID (FK → Story)
- `rating`: int (1–5)
- `content`: string
- `created_at`: datetime

### Bookshelf
- `id`: UUID
- `user_id`: UUID (FK → User)
- `story_id`: UUID (FK → Story)
- `note`: string
- `saved_at`: datetime

### ReadingHistory
- `id`: UUID
- `user_id`: UUID (FK → User)
- `story_id`: UUID (FK → Story)
- `last_chapter_id`: UUID (FK → Chapter)
- `last_read_at`: datetime

### ChapterReadLog *(new)*
- `id`: UUID
- `user_id`: UUID (FK → User)
- `chapter_id`: UUID (FK → Chapter)
- `story_id`: UUID (FK → Story)
- `read_at`: datetime

---

## Relationships

- `User` 1 → 1 `UserSettings`
- `UserSettings` 1 → 1 `TTSSettings`
- `UserSettings` 1 → 1 `UISettings`
- `User` 1 → 0..* `Story` (authors)
- `Story` 1 → 1..* `Chapter` (contains)
- `User` 1 → 0..* `Comment` (writes)
- `Story` 1 → 0..* `Comment` (has)
- `Chapter` 0..1 → 0..* `Comment` (nullable — story-level if null)
- `Comment` 0..1 → 0..* `Comment` (threaded replies)
- `User` 1 → 0..* `Review` (writes)
- `Story` 1 → 0..* `Review` (has)
- `User` 1 → 0..* `Bookshelf` (saves)
- `Story` 1 → 0..* `Bookshelf` (saved in)
- `User` 1 → 0..* `ReadingHistory` (tracks last chapter per story)
- `Story` 1 → 0..* `ReadingHistory`
- `User` 1 → 0..* `ChapterReadLog` (all chapters ever read)
- `Chapter` 1 → 0..* `ChapterReadLog`

---

## Use Case Diagram (Overview)

**Actors**
- **Guest** — unauthenticated visitor
- **User** — logged-in reader
- **Author** — User with author role; inherits all User use cases
- **Admin** — User with admin role; inherits all User use cases

---

## Use Case Specifications

---

### UC-01: Register

| Field | Detail |
|---|---|
| **Use case ID** | UC-01 |
| **Use case name** | Register |
| **Actor** | Guest |
| **Precondition** | User is not logged in |
| **Postcondition** | New account created; user is logged in |

**Main flow**
1. Guest navigates to the registration page.
2. Guest enters username, email, and password.
3. System validates that username and email are unique.
4. System hashes the password and creates the User record with role `user`.
5. System creates default UserSettings for the new user.
6. System logs the user in and redirects to the home page.

**Alternative flow — validation error**
- 3a. Username or email already exists → system displays an error message; user corrects the input and retries from step 2.

**Exception flow**
- Any step: network/server error → system displays a generic error; form data is preserved.

---

### UC-02: Login

| Field | Detail |
|---|---|
| **Use case ID** | UC-02 |
| **Use case name** | Login |
| **Actor** | Guest |
| **Precondition** | User has a registered account |
| **Postcondition** | User is authenticated and redirected to the home page |

**Main flow**
1. Guest navigates to the login page.
2. Guest enters username or email and password.
3. System looks up the account by username or email.
4. System verifies the password hash.
5. System creates a session/token and redirects the user.

**Alternative flow — invalid credentials**
- 4a. Password does not match → system shows a generic "invalid credentials" error (no disclosure of which field is wrong); user retries.

**Alternative flow — account not found**
- 3a. No account found for the given identifier → same generic error as 4a.

---

### UC-03: Account Recovery

| Field | Detail |
|---|---|
| **Use case ID** | UC-03 |
| **Use case name** | Account recovery |
| **Actor** | Guest |
| **Precondition** | User has a registered email |
| **Postcondition** | User can set a new password and log in |

**Main flow**
1. Guest clicks "Forgot password" on the login page.
2. Guest enters their registered email address.
3. System sends a time-limited reset link to that email.
4. Guest opens the link, enters a new password, and confirms it.
5. System hashes and saves the new password; invalidates all existing sessions.
6. System redirects the user to the login page.

**Alternative flow — email not found**
- 3a. No account matches the email → system shows a neutral confirmation message (no disclosure of existence).

**Exception flow**
- 4a. Reset link has expired → system prompts the user to request a new one.

---

### UC-04: Manage Profile

| Field | Detail |
|---|---|
| **Use case ID** | UC-04 |
| **Use case name** | Manage profile |
| **Actor** | User (all authenticated roles) |
| **Precondition** | User is logged in |
| **Postcondition** | User profile is updated |

**Main flow**
1. User navigates to the profile settings page.
2. User edits one or more fields: name, bio, avatar, email, password.
3. For password change: user must enter current password before setting a new one.
4. System validates input (email uniqueness, password strength).
5. System saves changes and confirms success.

**Alternative flow — email already taken**
- 4a. Email belongs to another account → system shows an error; user enters a different email.

**Alternative flow — wrong current password**
- 3a. Current password is incorrect → system shows an error; password is not changed.

---

### UC-05: Search and Filter Story

| Field | Detail |
|---|---|
| **Use case ID** | UC-05 |
| **Use case name** | Search and filter story |
| **Actor** | Guest, User |
| **Precondition** | None |
| **Postcondition** | A filtered list of stories is displayed |

**Main flow**
1. Actor enters a keyword in the search bar or opens the browse/filter page.
2. Actor optionally applies filters: genre, status (ongoing/completed), rating range, sort order (newest, top rated, most read).
3. System queries stories matching the keyword and filters.
4. System displays the result list with title, poster, rating, and latest chapter.
5. Actor clicks a story to view its detail page.

**Alternative flow — no results**
- 3a. No stories match → system displays a "no results found" message and suggests clearing filters.

---

### UC-06: Read Story

| Field | Detail |
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
   - Suspend or reactivate account
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