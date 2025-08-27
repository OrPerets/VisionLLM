## VisionLLM Backlog

### Purpose and scope
Deliver project-scoped collaboration with Google Login, an admin console to manage projects and members, shared chats per project, and per-project system instructions that steer the LLM. Include essentials for access control, auditability, and collaboration UX.

---

## Personas and roles
- **Admin**: Can create/manage projects, assign/remove members, manage system instructions.
- **Worker**: Member of one or more projects; can create/view project conversations and messages.

---

## Milestones

### M1 — Authentication (Google) and user model
- [ ] Google OAuth login and logout
- [ ] Session management (secure cookies/JWT)
- [ ] Auto-provision users on first login
- [ ] Basic roles: `admin`, `worker`
- [ ] Protected routes (frontend + backend)
- [ ] Admin bootstrap strategy (first user as admin or env-seeded)

### M2 — Projects and membership
- [ ] CRUD for projects
- [ ] Project membership management (assign/remove workers)
- [ ] Per-project “system instructions” (Markdown or rich text)
- [ ] RBAC: Admin-only project/membership edits
- [ ] List projects visible to the current user

### M3 — Conversations and shared chats (project scope)
- [ ] Conversations belong to a project
- [ ] Workers in the same project see and search all project conversations
- [ ] Messages inherit conversation visibility
- [ ] Update LLM calls to prepend project system instructions
- [ ] Basic activity log entries

### M4 — Collaboration features (core)
- [ ] Presence indicators (who’s online in project)
- [ ] Typing indicator in conversations
- [ ] Mentions (@user) with in-app notification
- [ ] Pinned messages per conversation
- [ ] Shared prompt templates per project

### M5 — Admin area and polish
- [ ] Admin UI to manage projects, members, roles, and audit logs
- [ ] Export conversation transcripts (JSON/Markdown)
- [ ] Search across projects/conversations
- [ ] Basic rate limiting and abuse protections
- [ ] Docs, seed data, and end-to-end tests

---

## User stories and acceptance criteria

### Epic: Google Login
- As a user, I can log in via Google so I don’t need a separate password.
  - [ ] “Login with Google” on main page
  - [ ] Successful OAuth callback creates/updates user profile (email, name, avatar)
  - [ ] Sessions persist across reloads; logout clears session
  - [ ] Configurable domain allowlist (optional)

- As an admin, I can be designated to access the admin console.
  - [ ] First admin configured via seed/env or first user rule
  - [ ] Non-admin accessing admin pages receives 403

### Epic: Projects and membership
- As an admin, I can create a project with a name and description.
  - [ ] Create/edit/archive project
  - [ ] Validation for unique project name per org/tenant (if applicable)

- As an admin, I can add/remove workers to a project.
  - [ ] Search users by email/name
  - [ ] Add/remove membership instantly reflected in access

- As an admin, I can set “system instructions” per project that affect LLM responses.
  - [ ] Rich text/Markdown supported
  - [ ] Versioned history (optional, M5)
  - [ ] Preview LLM with current instructions (optional)

- As a worker, I can see projects I belong to.
  - [ ] Projects page lists only my projects
  - [ ] Direct navigation via `projects/[projectId]`

### Epic: Conversations and shared chats
- As a worker, I can create a conversation within a project.
  - [ ] New conversation requires `projectId`
  - [ ] Title auto-generated or editable

- As a worker, I can see all conversations for my project.
  - [ ] List, filter, and search conversations by title/content/author
  - [ ] Only members of the project can view its conversations

- As a worker, my messages include the project’s system instructions when querying the LLM.
  - [ ] Backend composes prompt = project system instructions + chat history + user message
  - [ ] Streaming responses preserved

### Epic: Collaboration features
- Presence
  - [ ] Online status of project members (basic last-seen if real-time not available)
- Typing indicator
  - [ ] Show when another member is typing in the same conversation
- Mentions and notifications
  - [ ] @mention a project member; in-app toast/badge shows mention; link to message
- Pinned messages
  - [ ] Pin/unpin per conversation; pins surfaced in a side panel
- Shared prompt templates (per project)
  - [ ] Create, share, and insert templates into composer

### Epic: Admin area and auditability
- Admin console
  - [ ] Projects table, membership management, role assignment
  - [ ] View recent activity (project created, member added, conversation created)
- Export and governance
  - [ ] Export conversation as JSON/Markdown
  - [ ] Optional retention settings per project (M5+)
- Rate limiting and abuse protection
  - [ ] Per-user/per-project limits; friendly error messaging

---

## Technical plan

### Backend (FastAPI)
- Auth
  - [ ] Add Google OAuth flow endpoints: `/auth/login/google`, `/auth/callback`, `/auth/logout`, `/auth/me`
  - [ ] Store session as HTTP-only secure cookie or JWT; refresh strategy defined
  - [ ] Domain allowlist via env `ALLOWED_GOOGLE_DOMAINS` (comma-separated)

- Authorization
  - [ ] Role model: `admin`, `worker`
  - [ ] Dependency/guard for admin routes
  - [ ] Project membership check for project and conversation routes

- Projects
  - [ ] Extend `projects` with `system_instructions TEXT`
  - [ ] `project_members` table (user_id, project_id, role_in_project)
  - [ ] Endpoints:
    - `GET /projects` (mine), `POST /projects` (admin), `GET /projects/{id}`
    - `PATCH /projects/{id}` (admin; includes system instructions)
    - `POST /projects/{id}/members` (admin), `DELETE /projects/{id}/members/{userId}` (admin)

- Conversations/Messages
  - [ ] Ensure `conversations` has `project_id`
  - [ ] Enforce visibility: only members can access
  - [ ] Endpoints:
    - `GET /projects/{id}/conversations`
    - `POST /projects/{id}/conversations`
    - `GET /conversations/{id}`, `DELETE /conversations/{id}` (owner/admin)
    - `POST /conversations/{id}/messages` (stream), `GET /conversations/{id}/messages`

- LLM integration
  - [ ] Compose prompt with `project.system_instructions` in `tgi_client` (or call site)
  - [ ] Add trace metadata: project_id, conversation_id, user_id

- Collaboration primitives
  - [ ] Presence: store ephemeral last_seen; optional WebSocket channel
  - [ ] Typing indicator: transient events via WebSocket (or polling fallback)
  - [ ] Mentions: parse `@` tokens, validate membership, create notification entries

- Activity log
  - [ ] `activity_logs` table: id, actor_id, action, object_type, object_id, project_id, created_at

- Testing
  - [ ] Unit and integration tests for RBAC, project scoping, and LLM prompt composition

### Database (Alembic)
- Migrations
  - [ ] Add `system_instructions` to `projects`
  - [ ] Create `project_members (project_id, user_id, role_in_project, created_at, unique(project_id,user_id))`
  - [ ] Ensure `conversations.project_id` exists and is non-null
  - [ ] `activity_logs` table
  - [ ] `notifications` table (optional M4): id, user_id, type, data JSONB, read_at

### Frontend (Next.js App Router)
- Auth
  - [ ] `/` is the Google login page (button + explanation)
  - [ ] Protect routes; fetch `/auth/me`; store user in global store
  - [ ] Logout button

- Navigation
  - [ ] `/projects` list (mine)
  - [ ] `/projects/[projectId]` overview (members, activity, settings)
  - [ ] `/projects/[projectId]/conversations/[conversationId]` chat UI
  - [ ] `/admin` area for admins

- Projects UI
  - [ ] Create/edit project (admin)
  - [ ] Manage members (admin)
  - [ ] System instructions editor (Markdown with preview)

- Conversations UI
  - [ ] Sidebar of project conversations with search
  - [ ] Chat window with stream, mentions, pins
  - [ ] Presence/typing indicator

- Collaboration
  - [ ] Pinned messages panel
  - [ ] Prompt templates panel (create/insert)
  - [ ] In-app notifications (badge + list)

- UX polish
  - [ ] Empty states, error boundaries, optimistic updates
  - [ ] Loading skeletons and toasts

### Configuration and infra
- [ ] Env vars:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - `SESSION_SECRET`, `ALLOWED_GOOGLE_DOMAINS`
- [ ] Update `infra/env.api.example` and `infra/docker-compose.yml`
- [ ] Seed script for admin user and a demo project
- [ ] Rate limit middleware (per IP/user)

---

## Data model (proposed)
- `users`: id, email, name, avatar_url, role, created_at, updated_at
- `projects`: id, name, description, system_instructions, created_by, created_at, updated_at
- `project_members`: project_id, user_id, role_in_project, created_at
- `conversations`: id, project_id, title, created_by, created_at, updated_at
- `messages`: id, conversation_id, role (user/assistant/system), content, created_by, created_at
- `activity_logs`: id, actor_id, action, object_type, object_id, project_id, created_at
- `notifications` (optional): id, user_id, type, data, read_at, created_at

---

## Non-functional requirements
- **Security**: HTTP-only cookies, CSRF protection, input validation
- **Privacy**: Project-level access only; no cross-project leakage
- **Performance**: Stream responses; paginate lists; index FK columns
- **Reliability**: Handle LLM timeouts/retries; graceful fallbacks for realtime features
- **Observability**: Structured logging with project_id/conversation_id; basic metrics

---

## Definition of done
- Auth, RBAC, and project scoping enforced across API and UI
- Per-project system instructions reliably affect LLM responses
- Workers in the same project see and collaborate on shared conversations
- Admin console functions (projects, members, audit) available and permissioned
- Tests passing; docs updated; seeds provided