# Use Case Specifications (Vertical Layout)

## UC-01: Register
| Field | Description |
|---|---|
| Use case ID | UC-01 |
| Name | Register |
| Actor | Guest |
| Precondition | User is not authenticated |
| Postcondition | `User` and default `UserSettings` are created; user is authenticated |
| Main flow | 1. Submit username, email, name, and password.<br>2. Validate fields and uniqueness.<br>3. Hash password and create records.<br>4. Set HttpOnly refresh cookie and return access token. |
| Alternate flow | Duplicate username/email returns a conflict. |

## UC-02: Login
| Field | Description |
|---|---|
| Use case ID | UC-02 |
| Name | Login |
| Actor | Guest |
| Precondition | Account exists |
| Postcondition | Authenticated session is available |
| Main flow | 1. Submit username/email and password.<br>2. Verify password.<br>3. Return short-lived access token.<br>4. Rotate HttpOnly refresh cookie. |
| Alternate flow | Invalid credentials return a neutral unauthorized response. |

## UC-03: Reset Password
| Field | Description |
|---|---|
| Use case ID | UC-03 |
| Name | Reset Password |
| Actor | Guest |
| Precondition | Registered email is available |
| Postcondition | Password is replaced and user can log in |
| Main flow | 1. Request reset email.<br>2. Create time-bound token and send link.<br>3. Submit token and new password.<br>4. Hash password and invalidate used tokens. |
| Alternate flow | Unknown email receives a neutral response. |

## UC-04: Manage Profile
| Field | Description |
|---|---|
| Use case ID | UC-04 |
| Name | Manage Profile |
| Actor | User |
| Precondition | User is authenticated |
| Postcondition | Profile fields are updated |
| Main flow | 1. Edit name, bio, avatar, email, or password.<br>2. Validate changed values.<br>3. Save and return the complete profile projection. |
| Alternate flow | Duplicate email or incorrect current password rejects the update. |

## UC-05: Browse and Search Stories
| Field | Description |
|---|---|
| Use case ID | UC-05 |
| Name | Browse and Search Stories |
| Actor | Guest, User |
| Precondition | None |
| Postcondition | Matching story results are displayed |
| Main flow | 1. Submit search text, page, page size, and sort.<br>2. Query story dataset.<br>3. Display results.<br>4. Open selected story detail. |
| Alternate flow | No matches display an empty state. |

## UC-06: Read Story and Track Progress
| Field | Description |
|---|---|
| Use case ID | UC-06 |
| Name | Read Story and Track Progress |
| Actor | Guest, User |
| Precondition | Story has at least one chapter |
| Postcondition | Content is displayed; completed chapters update User history |
| Main flow | 1. Open story and select chapter.<br>2. Load content from object storage.<br>3. Read and navigate chapters.<br>4. When final paragraph is visible, update `ReadingHistory` and `ChapterReadLog`. |
| Alternate flow | Stopping before the final paragraph does not mark completion; storage failure leaves history unchanged. |

## UC-07: Manage Bookshelf and Reading State
| Field | Description |
|---|---|
| Use case ID | UC-07 |
| Name | Manage Bookshelf and Reading State |
| Actor | User |
| Precondition | User is authenticated |
| Postcondition | Story is saved or removed |
| Main flow | 1. Open story detail.<br>2. Save or remove story.<br>3. Backend upserts or deletes `Bookshelf` record.<br>4. Open saved stories from bookshelf. |
| Alternate flow | Existing save toggles instead of creating a duplicate. |

## UC-08: Comment and Review
| Field | Description |
|---|---|
| Use case ID | UC-08 |
| Name | Comment and Review |
| Actor | User |
| Precondition | User is authenticated |
| Postcondition | Comment or one-per-story review is stored |
| Main flow | 1. Create story/chapter comment or reply.<br>2. Validate ownership context.<br>3. Submit optional 1-5 review.<br>4. Refresh thread and rating data. |
| Alternate flow | Blank comments, invalid chapters, and cross-story replies are rejected. |

## UC-09: Author Story and Chapter Management
| Field | Description |
|---|---|
| Use case ID | UC-09 |
| Name | Author Story and Chapter Management |
| Actor | Author, Admin |
| Precondition | Actor has author/admin role |
| Postcondition | Story or chapter is created, updated, or deleted |
| Main flow | 1. Create/edit story metadata and poster.<br>2. Add/update/delete chapters and content.<br>3. Store content in object storage.<br>4. Reindex chapters after deletion. |
| Alternate flow | Duplicate slugs are rejected; failed batch uploads clean up created rows and files. |

## UC-10: TTS Playback Controls
| Field | Description |
|---|---|
| Use case ID | UC-10 |
| Name | TTS Playback Controls |
| Actor | User |
| Precondition | User is reading a chapter |
| Postcondition | Chapter text is played with selected controls |
| Main flow | 1. Select language, voice, and speed.<br>2. Start browser or ResponsiveVoice playback.<br>3. Pause, resume, stop, auto-next, or use sleep timer. |
| Alternate flow | TTS failure leaves normal chapter reading available; hidden keys are excluded. |

## UC-11: Manage ResponsiveVoice Keys
| Field | Description |
|---|---|
| Use case ID | UC-11 |
| Name | Manage ResponsiveVoice Keys |
| Actor | User, Admin |
| Precondition | Actor is authenticated |
| Postcondition | Keys are managed with correct visibility |
| Main flow | 1. List available keys.<br>2. User manages own keys.<br>3. Admin creates/manages global keys.<br>4. Admin dashboard supports creation, editing, hiding, and deletion. |
| Alternate flow | Unauthorized ownership changes return forbidden; invalid or missing keys return validation/not-found errors. |

## UC-12: Customize Reader Settings
| Field | Description |
|---|---|
| Use case ID | UC-12 |
| Name | Customize Reader Settings |
| Actor | User |
| Precondition | User is authenticated |
| Postcondition | Reader preferences apply immediately; supported TTS fields are saved |
| Main flow | 1. Switch light/dark theme.<br>2. Customize per-theme colors, font, text size, line height, and reader width.<br>3. Preview changes.<br>4. Save supported TTS fields through `UserSettings`. |
| Alternate flow | Reset restores defaults; preferences reset when the memory-only store is cleared. |

## UC-13: Admin User Administration and Statistics
| Field | Description |
|---|---|
| Use case ID | UC-13 |
| Name | Admin User Administration and Statistics |
| Actor | Admin |
| Precondition | Actor has admin role |
| Postcondition | User administration or statistics are completed |
| Main flow | 1. List/filter users.<br>2. Change roles or delete users.<br>3. View aggregate statistics.<br>4. Manage ResponsiveVoice keys. |
| Alternate flow | Non-admin access is rejected; missing users return not-found responses. |