# Maintenance Page Agile Plan

## Background

- Provide a self-service `/maintenance` page where the CEO or other admins can describe new features in natural language.
- An AI chat assistant asks clarifying questions until requirements are actionable and emits `CONFIRMED` when ready.
- The backend converts the confirmed transcript into a Markdown implementation plan and stores it under `tasks/` using a timestamped slug.
- Optionally, an automated coding agent can read the plan, apply code changes, run tests, and open a pull request.
- The repository consists of a FastAPI backend and Next.js frontend with existing chat infrastructure and Makefile tooling.

## Success Criteria

- Access to the maintenance page and endpoints is restricted to authenticated admins.
- Requirement gathering covers acceptance criteria, data model updates, API endpoints, and UI changes before `CONFIRMED` is issued.
- Generated plans are saved to `tasks/<timestamp>-<slug>.md` and linked back to the requester.
- When invoked, the automated agent runs `pytest` and `npm test`, commits changes, and opens a PR.
- Documentation in `README.md` describes the maintenance workflow and all generated files are version-controlled for audit purposes.

## Sprint 1 – Maintenance Page & Chat Requirements

**Duration:** 1 week  
**Goal:** Allow admins to access a maintenance page with a requirement-gathering chat.

### Tasks
- [ ] Create `/maintenance` Next.js route guarded for admins only.
- [ ] Embed existing chat component with a special system prompt: *"You are a product-spec assistant…"*
- [ ] Display "Generate Plan" button, enabled only after the assistant replies `CONFIRMED`.
- [ ] Add backend router `POST /api/maintenance/stream` for requirement collection.

### Definition of Done
- Admin-only page renders successfully.
- Chat flows until assistant emits `CONFIRMED`.
- Backend streaming endpoint mirrors existing chat functionality.

---

## Sprint 2 – Plan Generation & Storage

**Duration:** 1 week  
**Goal:** Convert a confirmed conversation into a saved implementation plan.

### Tasks
- [ ] Implement `POST /api/maintenance/plan` to accept transcript, prompt the LLM for a Markdown plan (summary, user stories, layer-by-layer steps, test plan).
- [ ] Save plan to `tasks/<timestamp>-<slug>.md` and return link.
- [ ] Update API typings and helpers (e.g., `frontend/lib/types.ts`).
- [ ] Wire frontend "Generate Plan" action to call the new endpoint.

### Definition of Done
- Endpoint returns saved plan link.
- Types compile and frontend displays the link after generation.

---

## Sprint 3 – Automation, Docs & Quality Assurance

**Duration:** 1–2 weeks  
**Goal:** Provide optional automated code generation and complete documentation/testing.

### Tasks
- [ ] Prototype automated coding agent: read plan, modify files, run `pytest` and `npm test`, commit, and open PR.
- [ ] Add FastAPI unit tests for new routes and integration test simulating a maintenance request.
- [ ] Add frontend tests for admin access and plan generation flow.
- [ ] Document usage in `README.md` and link to generated `tasks/` files.
- [ ] Enforce admin authentication and ensure generated files are version-controlled for audit trail.

### Definition of Done
- Automated agent successfully opens a PR in a dry run.
- Tests cover new backend and frontend pieces.
- README describes maintenance workflow clearly.

---

## Additional Guidance for Implementers
- **Slug & Timestamp:** Ensure filenames use a safe slug plus a timestamp to avoid collisions.
- **Prompt Strategy:** Chat prompt must solicit acceptance criteria, data model updates, endpoints, and UI changes before returning `CONFIRMED`.
- **Security:** Limit all maintenance endpoints to authenticated admins; log all generated tasks for traceability.
- **Future Enhancements:** Consider priority/status tagging, versioned plan updates, and GitHub/Jira issue creation for later iterations.

## Testing Strategy

- Unit tests for new backend routes and a full integration test simulating a maintenance request.
- Frontend tests verifying admin-only access and plan generation flow.
- Existing CI builds the Docker image and ensures `pytest` and `npm test` run on pull requests.

