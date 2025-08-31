# Maintenance Page Agile Plan

## Background

- Provide a self-service `/maintenance` page where the CEO or other admins can describe new features in natural language.
- An AI chat assistant asks clarifying questions until requirements are actionable and emits `CONFIRMED` when ready.
- The backend converts the confirmed transcript into a Markdown implementation plan and stores it under `tasks/` using a timestamped slug.
- After a plan is generated, an automated coding agent (using Codex or a similar coding service) implements the feature, runs tests, commits to a dedicated branch, pushes, and opens a pull request.
- The repository consists of a FastAPI backend and Next.js frontend with existing chat infrastructure and Makefile tooling.

### End-to-End Workflow
1. The CEO requests a new feature on the `/maintenance` page.
2. The AI assistant interacts with the CEO, asking clarifying questions.
3. Once the requirements are confirmed, the agent produces a detailed plan.
4. A coding service such as Codex develops the feature following the plan.
5. The agent runs tests and commits the changes to a non-`main` branch, then pushes and opens a PR.

## Success Criteria

- Access to the maintenance page and endpoints is restricted to authenticated admins.
- Requirement gathering covers acceptance criteria, data model updates, API endpoints, and UI changes before `CONFIRMED` is issued.
- Generated plans are saved to `tasks/<timestamp>-<slug>.md` and linked back to the requester.
- When invoked, the automated agent uses a coding service (e.g., Codex) to implement the feature, runs `pytest` and `npm test`, commits the changes to a non-`main` branch, pushes, and opens a PR.
- Documentation in `README.md` describes the maintenance workflow and all generated files are version-controlled for audit purposes.

## Sprint 1 – Maintenance Page & Chat Requirements

**Duration:** 1 week  
**Goal:** Allow admins to access a maintenance page with a requirement-gathering chat.

### Tasks
- [x] Create `/maintenance` Next.js route guarded for admins only.
- [x] Embed existing chat component with a system prompt detailing full instructions:

    *"You are an AI development agent. When the CEO describes a feature, ask clarifying questions until requirements are actionable and reply `CONFIRMED`. After confirmation, draft an implementation plan and invoke a coding service (e.g., Codex) to implement the feature. Run `pytest` and `npm test`, commit to a non-`main` branch, push, and open a pull request."*
- [x] Display "Generate Plan" button, enabled only after the assistant replies `CONFIRMED`.
- [x] Add backend router `POST /api/maintenance/stream` for requirement collection.

### Definition of Done
- Admin-only page renders successfully.
- Chat flows until assistant emits `CONFIRMED`.
- Backend streaming endpoint mirrors existing chat functionality.

---

## Sprint 2 – Plan Generation & Storage

**Duration:** 1 week  
**Goal:** Convert a confirmed conversation into a saved implementation plan.

### Tasks
- [x] Implement `POST /api/maintenance/plan` to accept transcript, prompt the LLM for a Markdown plan (summary, user stories, layer-by-layer steps, test plan).
- [x] Save plan to `tasks/<timestamp>-<slug>.md` and return link.
- [x] Update API typings and helpers (e.g., `frontend/lib/types.ts`).
- [x] Wire frontend "Generate Plan" action to call the new endpoint.

### Definition of Done
- Endpoint returns saved plan link.
- Types compile and frontend displays the link after generation.

---

## Sprint 3 – Automation, Docs & Quality Assurance

**Duration:** 1–2 weeks
**Goal:** Provide automated code generation and complete documentation/testing.

### Tasks
- [x] Build automated coding agent using Codex or a similar service: read the plan, modify files, run `pytest` and `npm test`, commit to a feature branch, push, and open a PR.
- [x] Add FastAPI unit tests for new routes and integration test simulating a maintenance request.
- [x] Add frontend tests for admin access and plan generation flow.
- [x] Document usage in `README.md` and link to generated `tasks/` files.
- [x] Enforce admin authentication and ensure generated files are version-controlled for audit trail.

### Definition of Done
- Automated agent successfully implements code and opens a PR from a non-`main` branch in a dry run.
- Tests cover new backend and frontend pieces.
- README describes maintenance workflow clearly.

---

## Sprint 4 – End-to-End Testing

**Duration:** 1 week
**Goal:** Verify the complete maintenance workflow from request to pull request.

### Tasks
- [ ] Simulate an admin creating a maintenance request, generating a plan, and triggering the automated agent.
- [ ] Add integration tests covering the full flow from chat to generated plan and automated commit.
- [ ] Perform manual smoke tests ensuring tasks are saved and linked for audit.
- [ ] Document how to run the end-to-end test and troubleshoot failures.

### Definition of Done
- Full workflow executes without errors.
- End-to-end tests pass and cover critical paths.
- Documentation reflects the testing process and outcomes.

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

