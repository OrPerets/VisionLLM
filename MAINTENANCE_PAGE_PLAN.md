# Maintenance Page & Autonomous Feature Workflow

## Goal
Provide a self-service page where the CEO can describe new features in natural language. An AI agent will:
1. Ask clarifying questions until requirements are actionable.
2. Generate a step-by-step implementation plan in Markdown.
3. Optionally trigger an automated coding agent (e.g., Codex) that applies the plan, runs tests, and opens a PR so CI/CD can build the new version.

## Current Repository Overview
- **backend/** – FastAPI app with routers, models and services.
- **frontend/** – Next.js client with chat UI and modern UX.
- **Makefile** – Docker/dev helpers; CI uses GitHub Actions to build the Docker image.
- **backlog.md** – Product backlog and roadmap documentation.

## Proposed Workflow
1. **CEO visits `/maintenance`** (admin-only route) on the web UI.
2. Page shows a chat box powered by the existing chat infrastructure but with a system prompt like:
   > "You are a product-spec assistant. Collect requirements for a new feature. Ask follow-up questions until the feature is clearly defined, including acceptance criteria, data model updates, API endpoints, and UI changes. When ready, output 'CONFIRMED'." 
3. Conversation continues until the LLM outputs `CONFIRMED`.
4. Frontend calls `/api/maintenance/plan` with the conversation transcript.
5. Backend sends the transcript to the LLM with a prompt to produce a **Markdown plan** that includes:
   - Summary & goal
   - User stories / acceptance criteria
   - Implementation steps per layer (backend, frontend, infra, docs)
   - Test plan
6. Backend writes the Markdown to `tasks/<slug>.md` and returns a link in the response.
7. Optionally the system can trigger a second agent:
   - Load the plan
   - Generate code changes per step
   - Run `pytest` and `npm test`
   - Commit changes and open a PR (GitHub Action then builds Docker image).

## Implementation Details
### Frontend
- Add `frontend/app/maintenance/page.tsx` accessible only to admins.
- Reuse chat components from `frontend/components/chat` but with custom system instructions and a "Generate Plan" button that calls the backend when the conversation is confirmed.

### Backend
- Router `backend/app/routers/maintenance.py` with:
  - `POST /api/maintenance/stream` – streaming chat endpoint (reuse existing chat service with different system prompt).
  - `POST /api/maintenance/plan` – accepts transcript, asks LLM to output Markdown, saves file under `tasks/`.
- File writing uses safe slug from feature title and prepends timestamp.
- Update `backend/app/main.py` to include the new router.

### Automated Coding Agent (future)
- Service that reads the generated plan and performs:
  1. For each step, instruct Codex to modify relevant files.
  2. Run formatters and tests.
  3. Commit and push to a new branch.
  4. Open PR via GitHub API.
- Failures or clarifications are fed back into the chat for human oversight.

### Security & Permissions
- Only authenticated admins can access the page and endpoints.
- Generated files are stored under version control to maintain audit trail.

## Step-by-Step Implementation Plan
1. **Frontend page** (`/maintenance`)
   - Create new Next.js route and admin guard.
   - Embed chat component with system prompt.
   - Add "Generate Plan" action when LLM responds with `CONFIRMED`.
2. **Backend chat endpoint**
   - Create router and FastAPI dependencies similar to existing chat router.
   - Use dedicated system instructions for requirement gathering.
3. **Plan generation endpoint**
   - Receive conversation transcript.
   - Prompt LLM to return Markdown implementation plan.
   - Save file to `tasks/<timestamp>-<slug>.md`.
4. **Wire up routing and types**
   - Update API typings (`frontend/lib/types.ts`) and helpers.
5. **Optional: automated coding agent**
   - Script that reads plan, calls Codex to apply changes, runs tests (`pytest`, `npm test`), commits, and opens PR.
6. **Documentation**
   - Add usage instructions to `README.md` and link to generated task files.

## Testing Strategy
- Unit tests for new backend routes with FastAPI `TestClient`.
- Integration test simulating a maintenance request through the plan endpoint.
- Frontend tests verifying admin-only access and plan generation flow.
- CI: existing GitHub workflow builds docker image on PR, ensuring the new code builds.

## Future Enhancements
- Allow tagging tasks with priority/status and listing them in a dashboard.
- Enable versioned plan updates and automatic issue creation in GitHub or Jira.
- Support multi-step automated implementation with human approval gates.

