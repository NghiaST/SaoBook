// src/config/swagger.schemas.ts

export const ErrorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
}

export const PaginationQuery = {
  type: 'object',
  properties: {
    page:  { type: 'integer', default: 1 },
    limit: { type: 'integer', default: 20 },
  },
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const RegisterBody = {
  type: 'object',
  required: ['username', 'email', 'name', 'password'],
  properties: {
    username: { type: 'string', minLength: 3 },
    email:    { type: 'string', format: 'email' },
    name:     { type: 'string' },
    password: { type: 'string', minLength: 8 },
  },
}

export const LoginBody = {
  type: 'object',
  required: ['identifier', 'password'],
  properties: {
    identifier: { type: 'string', description: 'Username or email' },
    password:   { type: 'string' },
  },
}

export const AuthResponse = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        id:       { type: 'string' },
        username: { type: 'string' },
        name:     { type: 'string' },
        email:    { type: 'string' },
        role:     { type: 'string', enum: ['user', 'author', 'admin'] },
      },
    },
    accessToken:  { type: 'string' },
    refreshToken: { type: 'string' },
  },
}

export const ForgotPasswordBody = {
  type: 'object',
  required: ['email'],
  properties: {
    email: { type: 'string', format: 'email' },
  },
}

export const ResetPasswordBody = {
  type: 'object',
  required: ['token', 'newPassword'],
  properties: {
    token:       { type: 'string' },
    newPassword: { type: 'string', minLength: 8 },
  },
}

export const RefreshBody = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: { type: 'string' },
  },
}

// ── User ──────────────────────────────────────────────────────────────────────

export const UserSchema = {
  type: 'object',
  properties: {
    id:        { type: 'string' },
    username:  { type: 'string' },
    email:     { type: 'string' },
    name:      { type: 'string' },
    bio:       { type: 'string', nullable: true },
    avatarUrl: { type: 'string', nullable: true },
    role:      { type: 'string', enum: ['user', 'author', 'admin'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
}

export const UpdateProfileBody = {
  type: 'object',
  properties: {
    name:      { type: 'string' },
    email:     { type: 'string', format: 'email' },
    bio:       { type: 'string' },
    avatarUrl: { type: 'string' },
  },
}

export const ChangePasswordBody = {
  type: 'object',
  required: ['currentPassword', 'newPassword'],
  properties: {
    currentPassword: { type: 'string' },
    newPassword:     { type: 'string', minLength: 8 },
  },
}

// ── Story ─────────────────────────────────────────────────────────────────────

export const StorySchema = {
  type: 'object',
  properties: {
    id:          { type: 'string' },
    nameId:      { type: 'string' },
    name:        { type: 'string' },
    posterUrl:   { type: 'string', nullable: true },
    description: { type: 'string', nullable: true },
    sourceNote:  { type: 'string', nullable: true },
    authorId:    { type: 'string' },
    createdAt:   { type: 'string', format: 'date-time' },
    updatedAt:   { type: 'string', format: 'date-time' },
    avgRating:   { type: 'number', nullable: true },
    author: {
      type: 'object',
      nullable: true,
      properties: {
        id:       { type: 'string' },
        username: { type: 'string' },
        name:     { type: 'string' },
      },
    },
    _count: {
      type: 'object',
      nullable: true,
      properties: {
        chapters: { type: 'integer' },
        reviews:  { type: 'integer' },
      },
    },
  },
}

export const CreateStoryBody = {
  type: 'object',
  required: ['name', 'nameId'],
  additionalProperties: true,
  properties: {
    name: {
      anyOf: [{ type: 'string' }, { type: 'object' }],
    },
    nameId: {
      anyOf: [{ type: 'string' }, { type: 'object' }],
      description: 'URL slug, must be unique',
    },
    description: {
      anyOf: [{ type: 'string' }, { type: 'object' }],
    },
    sourceNote: {
      anyOf: [{ type: 'string' }, { type: 'object' }],
    },
    posterUrl: {
      anyOf: [{ type: 'string' }, { type: 'object' }],
      description: 'Remote image URL (optional)',
    },
    posterFile: {
      anyOf: [{ type: 'string', format: 'binary' }, { type: 'object' }],
      description: 'Poster file upload (optional)',
    },
  },
}

export const StoryListQuery = {
  type: 'object',
  properties: {
    q:     { type: 'string', description: 'Search keyword' },
    page:  { type: 'integer', default: 1 },
    limit: { type: 'integer', default: 20 },
    sort:  { type: 'string', enum: ['newest', 'rating', 'popular'], default: 'newest' },
  },
}

// ── Chapter ───────────────────────────────────────────────────────────────────

export const ChapterSchema = {
  type: 'object',
  properties: {
    id:         { type: 'string' },
    name:       { type: 'string' },
    order:      { type: 'integer' },
    contentUrl: { type: 'string' },
    storyId:    { type: 'string' },
    createdAt:  { type: 'string', format: 'date-time' },
    updatedAt:  { type: 'string', format: 'date-time' },
  },
}

export const CreateChapterBody = {
  type: 'object',
  required: ['name', 'content'],
  properties: {
    name:    { type: 'string' },
    content: { type: 'string' },
    order:   { type: 'integer' },
  },
}

export const BatchChaptersBody = {
  type: 'array',
  items: {
    type: 'object',
    required: ['name', 'content'],
    properties: {
      name:    { type: 'string' },
      content: { type: 'string' },
      order:   { type: 'integer' },
    },
  },
}

// ── Comment ───────────────────────────────────────────────────────────────────

export const CommentSchema = {
  type: 'object',
  properties: {
    id:              { type: 'string' },
    userId:          { type: 'string' },
    storyId:         { type: 'string' },
    chapterId:       { type: 'string', nullable: true },
    parentCommentId: { type: 'string', nullable: true },
    content:         { type: 'string' },
    createdAt:       { type: 'string', format: 'date-time' },
    user: {
      type: 'object',
      properties: {
        id: { type: 'string' }, username: { type: 'string' },
        name: { type: 'string' }, avatarUrl: { type: 'string', nullable: true },
      },
    },
  },
}

export const CreateCommentBody = {
  type: 'object',
  required: ['content'],
  properties: {
    content:         { type: 'string', minLength: 1 },
    chapterId:       { type: 'string', description: 'Null = story-level comment' },
    parentCommentId: { type: 'string', description: 'Null = top-level comment' },
  },
}

// ── Review ────────────────────────────────────────────────────────────────────

export const ReviewSchema = {
  type: 'object',
  properties: {
    id:        { type: 'string' },
    userId:    { type: 'string' },
    storyId:   { type: 'string' },
    rating:    { type: 'integer', minimum: 1, maximum: 5 },
    content:   { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    user: {
      type: 'object',
      properties: {
        id: { type: 'string' }, username: { type: 'string' },
        name: { type: 'string' }, avatarUrl: { type: 'string', nullable: true },
      },
    },
  },
}

export const UpsertReviewBody = {
  type: 'object',
  required: ['rating'],
  properties: {
    rating:  { type: 'integer', minimum: 1, maximum: 5 },
    content: { type: 'string' },
  },
}

// ── Bookshelf ─────────────────────────────────────────────────────────────────

export const BookshelfBody = {
  type: 'object',
  properties: {
    note: { type: 'string', description: 'Optional personal note for this story' },
  },
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export const AdminUserListQuery = {
  type: 'object',
  properties: {
    q:     { type: 'string' },
    role:  { type: 'string', enum: ['user', 'author', 'admin'] },
    page:  { type: 'integer', default: 1 },
    limit: { type: 'integer', default: 50 },
  },
}

export const ChangeRoleBody = {
  type: 'object',
  required: ['role'],
  properties: {
    role: { type: 'string', enum: ['user', 'author', 'admin'] },
  },
}
