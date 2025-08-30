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
- [x] Google OAuth login and logout
- [x] Session management (secure cookies/JWT)
- [x] Auto-provision users on first login
- [x] Basic roles: `admin`, `worker`
- [x] Protected routes (frontend + backend)
- [x] Admin bootstrap strategy (first user as admin or env-seeded)

### M2 — Projects and membership
- [x] CRUD for projects
- [x] Project membership management (assign/remove workers)
- [x] Per-project “system instructions” (Markdown or rich text)
- [x] RBAC: Admin-only project/membership edits
- [x] List projects visible to the current user

### M3 — Conversations and shared chats (project scope)
- [x] Conversations belong to a project
- [x] Workers in the same project see and search all project conversations
- [x] Messages inherit conversation visibility
- [x] Update LLM calls to prepend project system instructions
- [x] Basic activity log entries

### M4 — Collaboration features (core)
- [ ] Presence indicators (who’s online in project)
- [ ] Typing indicator in conversations
- [ ] Mentions (@user) with in-app notification
- [ ] Pinned messages per conversation
- [ ] Shared prompt templates per project

### M5 — Admin area and polish
- [x] Admin UI to manage projects, members, roles, and audit logs
- [x] Export conversation transcripts (JSON/Markdown)
- [x] Search across projects/conversations
- [x] Basic rate limiting and abuse protections
- [ ] Docs, seed data, and end-to-end tests

---

## User stories and acceptance criteria

### Epic: Google Login
- As a user, I can log in via Google so I don’t need a separate password.
  - [x] “Login with Google” on main page
  - [x] Successful OAuth callback creates/updates user profile (email, name, avatar)
  - [x] Sessions persist across reloads; logout clears session
  - [x] Configurable domain allowlist (optional)

- As an admin, I can be designated to access the admin console.
  - [x] First admin configured via seed/env or first user rule
  - [x] Non-admin accessing admin pages receives 403

### Epic: Projects and membership
- As an admin, I can create a project with a name and description.
  - [x] Create/edit/archive project
  - [x] Validation for unique project name per org/tenant (if applicable)

- As an admin, I can add/remove workers to a project.
  - [x] Add/remove membership instantly reflected in access

- As a worker, I can see projects I belong to.
  - [x] Projects page lists only my projects
  - [x] Direct navigation via `projects/[projectId]`

### Epic: Conversations and shared chats
- As a worker, I can create a conversation within a project.
  - [x] New conversation requires `projectId`
  - [x] Title auto-generated or editable

- As a worker, I can see all conversations for my project.
  - [x] List and search conversations by title/content (author filter pending)
  - [x] Only members of the project can view its conversations

- As a worker, my messages include the project’s system instructions when querying the LLM.
  - [x] Backend composes prompt = project system instructions + chat history + user message
  - [x] Streaming responses preserved

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
  - [x] Projects table, membership management, role assignment
  - [x] View recent activity (project created, member added, conversation created)
- Export and governance
  - [x] Export conversation as JSON/Markdown
  - [ ] Optional retention settings per project (M5+)
- Rate limiting and abuse protection
  - [x] Per-user/per-project limits; friendly error messaging

---

## Technical plan

### Backend (FastAPI)
- Auth
  - [x] Add Google OAuth flow endpoints: `/auth/login/google`, `/auth/callback`, `/auth/logout`, `/auth/me`
  - [x] Store session as HTTP-only secure cookie or JWT; refresh strategy defined
  - [x] Domain allowlist via env `ALLOWED_GOOGLE_DOMAINS` (comma-separated)

- Authorization
  - [x] Role model: `admin`, `worker`
  - [x] Dependency/guard for admin routes
  - [x] Project membership check for project and conversation routes

- Projects
  - [x] Extend `projects` with `system_instructions TEXT`
  - [x] `project_members` table (user_id, project_id, role_in_project)
  - [x] Endpoints:
    - `GET /projects` (mine), `POST /projects` (admin), `GET /projects/{id}`
    - `PATCH /projects/{id}` (admin; includes system instructions)
    - `POST /projects/{id}/members` (admin), `DELETE /projects/{id}/members/{userId}` (admin)

- Conversations/Messages
  - [x] Ensure `conversations` has `project_id`
  - [x] Enforce visibility: only members can access
  - [x] Endpoints:
    - `GET /projects/{id}/conversations`
    - `POST /projects/{id}/conversations`
    - `GET /conversations/{id}`, `DELETE /conversations/{id}` (owner/admin)
    - `POST /conversations/{id}/messages` (stream), `GET /conversations/{id}/messages`

- LLM integration
  - [x] Compose prompt with `project.system_instructions` in `tgi_client` (or call site)
  - [x] Add trace metadata: project_id, conversation_id, user_id

- Collaboration primitives
  - [ ] Presence: store ephemeral last_seen; optional WebSocket channel
  - [ ] Typing indicator: transient events via WebSocket (or polling fallback)
  - [ ] Mentions: parse `@` tokens, validate membership, create notification entries

- Activity log
  - [x] `activity_logs` table: id, actor_id, action, object_type, object_id, project_id, created_at

- Testing
  - [ ] Unit and integration tests for RBAC, project scoping, and LLM prompt composition

### Database (Alembic)
- Migrations
  - [x] Add `system_instructions` to `projects`
  - [x] Create `project_members (project_id, user_id, role_in_project, created_at, unique(project_id,user_id))`
  - [x] Ensure `conversations.project_id` exists and is non-null
  - [x] `activity_logs` table
  - [ ] `notifications` table (optional M4): id, user_id, type, data JSONB, read_at

### Frontend (Next.js App Router)
- Auth
  - [x] `/` is the Google login page (button + explanation)
  - [x] Protect routes; fetch `/auth/me`; store user in global store
  - [x] Logout button

- Navigation
  - [x] `/projects` list (mine)
  - [x] `/projects/[projectId]` basic page (auto-redirect to latest chat; full overview pending)
  - [x] `/projects/[projectId]/conversations/[conversationId]` chat UI
  - [x] `/admin` area for admins

- Projects UI
  - [x] Create/edit project (admin)
  - [x] Manage members (admin)
  - [ ] System instructions editor (Markdown with preview)

- Conversations UI
  - [x] Sidebar of project conversations with search
  - [x] Chat window with stream, mentions, pins
  - [ ] Presence/typing indicator

- Collaboration
  - [ ] Pinned messages panel
  - [ ] Prompt templates panel (create/insert)
  - [ ] In-app notifications (badge + list)

- UX polish
  - [ ] Empty states, error boundaries, optimistic updates
  - [x] Loading skeletons and toasts

### Configuration and infra
- [x] Env vars:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - `SESSION_SECRET`, `ALLOWED_GOOGLE_DOMAINS`
- [x] Update `infra/env.api.example` and `infra/docker-compose.yml`
- [x] Seed script for admin user and a demo project
- [x] Rate limit middleware (per IP/user)

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

## Immediate errors to handle
- Fix test flakiness around database initialization:
  - Ensure tables are created when using in-memory SQLite during tests (init before each request or use lifespan/fixtures).
- Resolve NOT NULL constraint on `conversations.updated_at` in streaming flow (ensure value is always set without relying on nullable operations).
- Align test environment to disable auth consistently without relying on external `.env.api`.

## Next steps
- Add unit tests for RBAC/membership guards and project scoping.
- Implement project members management UI and API search for users.
- Add conversations sidebar search/filter; optionally basic full-text.
- Introduce presence/typing primitives (polling or WS) and notifications scaffold.
- Admin console: projects table, recent activity view, and export transcripts.
- Add rate limiting middleware and friendly errors.
- Documentation polish and seed improvements.

---

## Epic: Agents (Snowflake/dbt/Tableau) — selection and recommendation

Goal: Add an Agent entity with metadata and system instructions; enable users to discover and select agents, and apply agent defaults/instructions within chat.

Status
- [x] Data model added (`Agent` in `backend/app/models.py`)
- [x] Schemas: `Agent*` models + `ChatStreamRequest.agent_id`
- [x] Migration 0003 for `agents` table and indexes
- [x] Public Agents router: list/get/recommend
- [x] Admin CRUD endpoints
- [x] Chat flow applies agent system instructions/defaults and stores meta
- [x] Seed sample agents
- [x] Frontend types and API helpers
- [x] Composer UI: agent picker, recommendations, selection badge
- [ ] README docs

Scope & acceptance criteria
- Backend
  - [x] Alembic migration creates `agents` with unique `(name, product)` and `idx_agents_product`.
  - [x] GET `/api/agents` filters: `q`, `product`, `category`, `tag`; returns enabled agents.
  - [x] GET `/api/agents/{id}` returns `AgentRead` or 404.
  - [x] POST `/api/agents/recommend` returns ranked `AgentRecommendation[]` with `reason`.
  - [x] Admin CRUD under `/api/admin/agents` (POST, PATCH, DELETE) with admin guard.
  - [x] Chat `/api/chat/stream` accepts `agent_id`; loads enabled agent; applies `system_instructions`; fills unset temperature/max_tokens/model_id from `agent.defaults_json`; appends `meta.agent` and persists in assistant `meta_json`.
  - [x] Tests cover list/filter, recommend scoring/sorting, and chat meta persistence.
- Frontend
  - [x] Types: `Agent`, `AgentRecommendRequest`, `AgentRecommendation`; extend chat request with `agent_id?`.
  - [x] API helpers: `listAgents`, `getAgent`, `recommendAgents`.
  - [x] Chat composer: local state (`selectedAgentId`, `agentSearch`, `recommendedAgents`); combobox near model selector; recommend on type; selection sets `selectedAgentId`; include in `streamChat` payload; render info line/badge.
  - [x] No regression in streaming.
- Docs/seed
  - [ ] Seed sample agents for Snowflake/dbt/Tableau with categories/tags and strong `system_instructions`.
  - [ ] README section explains Agents and recommendation behavior.

Technical tasks
1) Database
   - [ ] Create Alembic migration `0003_agents.py` to add table and indexes.

2) Backend API
   - [x] New router `backend/app/routers/agents.py`:
       - [x] GET `/agents` with filters and case-insensitive search across `name`, `description`, `categories_json`, `tags_json`.
       - [x] GET `/agents/{agent_id}`.
       - [x] POST `/agents/recommend` with term-overlap scoring + product boost; return top_k.
   - [x] Wire router in `backend/app/main.py`.
   - [x] Extend `backend/app/routers/admin.py` with:
       - [x] POST `/admin/agents` (AgentCreate)
       - [x] PATCH `/admin/agents/{id}` (AgentUpdate)
       - [x] DELETE `/admin/agents/{id}`
   - [x] Modify `backend/app/routers/chat.py` to accept/apply `agent_id` and defaults and to include `meta.agent`.

3) Seeding
   - [x] Update `backend/scripts/seed.py` to insert sample agents if none exist.

4) Frontend
   - [x] Update `frontend/lib/types.ts` and `frontend/lib/api.ts`.
   - [x] Update `frontend/components/chat/chat-composer.tsx` to add the agent picker and send `agent_id`.

5) Docs/QA
   - [ ] Add README section with overview and curl examples.
   - [ ] Manual acceptance checklist for backend/frontend.

Recommendation scoring (MVP)
- Tokenize/normalize `q` (lowercase, alphanumerics).
- Compute term overlap against `name + description + categories + tags`.
- Base score = overlap_count / max(6, len(q_terms)); clamp to [0, 1].
- Product boost (+0.1) if request.product matches agent.product.
- Reason string enumerates matched tags/categories and product boost.
- Sort desc by score; return top_k.

Risks/considerations
- SQLite JSON querying: use LIKE on serialized JSON or portable helpers.
- Keep defaults application non-destructive to explicit user overrides.
- Future: swap scoring to TF-IDF/embeddings for better relevance.

Rollout plan
- Land migration + routers + chat flow.
- Seed agents.
- Ship frontend types/API and agent picker UI.
- Add docs and perform acceptance.