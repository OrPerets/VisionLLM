## VisionBI AI — UI/UX Backlog (Phase 1–2)

This backlog upgrades the current PySide6 desktop app to a modern, engaging experience while keeping the existing Python architecture. It is organized into actionable tasks with acceptance criteria and file pointers.

Notes
- Primary target: Fluent 2 look and feel via `qfluentwidgets` with frameless acrylic window, message bubbles, refined theming, and micro‑interactions.
- Alternative track: Material look via `qt-material` (optional Epic M). Do only one visual library.
- Keep app logic as is (`llm.py`, `tools/sql_tools.py`); focus is presentation and UX.

Pre-flight
- Make a branch for the UI work.
- Ensure Python 3.10+ and current PySide6 already installed (exists in `requirements.txt`).
- Snapshot screenshots before starting for A/B.

### Epic 0 — Foundation and Design Tokens

0.1 Define design tokens (colors, spacing, typography)
- Description: Create a minimal design token set (accent, neutrals, elevation, border radius, spacing scale, font sizes).
- Files: `config.py` (new constants), `app.py` (`apply_theme` usage), `README.md` (document tokens).
- Acceptance criteria:
  - A single accent color and light/dark neutral palette are defined.
  - Spacing uses an 8px grid (4px sub-step allowed).
  - Font scale for titles, labels, body is documented.

0.2 Update `requirements.txt`
- Description: Add UI libraries.
- Files: `requirements.txt`
- Add:
  - `qfluentwidgets>=1.4.6`
  - `qtawesome>=1.2.4`
  - `qframelesswindow>=1.6.3`
- Acceptance criteria:
  - Fresh venv installs without errors.

0.3 Introduce feature flags
- Description: Extend `config.py` with flags to toggle new UI: `UI_USE_FLUENT`, `UI_FRAMELESS`, `UI_ENABLE_ANIMATIONS`.
- Files: `config.py`
- Acceptance criteria:
  - Flags exist; default to enabled for development.
  - Flags are read in `app.py` when building the window or applying theme.

### Epic 1 — Global Theming & Typography

1.1 Centralize theme application
- Description: Refactor `MainWindow.apply_theme` to read design tokens from `config.py` and compose QSS from them. Keep existing light/dark as fallback.
- Files: `app.py` (`MainWindow.apply_theme`), `config.py` (tokens).
- Acceptance criteria:
  - Switching theme updates colors, typography, borders, and states consistently.
  - No visual regressions in `Chat` and `SQL Tools` tabs.

1.2 Add scalable typography utility
- Description: Add helpers to scale font size globally from menu actions without breaking component layout.
- Files: `app.py` (`adjust_font_global`, `ChatTab.adjust_font`, `SqlTab.adjust_font`).
- Acceptance criteria:
  - Global font +/- works on all major text areas and labels.

### Epic 2 — Iconography and Visual Polish

2.1 Integrate `qtawesome`
- Description: Add icon pack; show icons on toolbar buttons and in the command palette.
- Files: `app.py` (buttons in `ChatTab`, `SqlTab`, `CommandPalette`).
- Acceptance criteria:
  - All main buttons (Send, ETL, Transpile, Lint, Export) have meaningful icons.
  - Command palette items show icons.

2.2 Card surfaces and elevation
- Description: Convert key panels to “card” look with soft shadows and reduced hard borders.
- Files: `app.py` (containers around output, logs, diff dialog surfaces).
- Acceptance criteria:
  - Output, logs, and diff panes render with subtle elevation instead of solid borders.

### Epic 3 — Frameless Window & Acrylic/Mica

3.1 Replace default window frame
- Description: Use `qframelesswindow` to create a custom, draggable title bar with window controls.
- Files: `app.py` (`MainWindow` construction), new small `widgets/titlebar.py` (custom title bar widget).
- Acceptance criteria:
  - Window is draggable from title area.
  - Minimize/maximize/close work on macOS.

3.2 Acrylic/Mica background
- Description: Enable blur/acrylic where supported (macOS: vibrancy, Windows: Mica). Provide fallback to solid.
- Files: `app.py` (window effects), `config.py` (flag `UI_ACRYLIC`), `README.md` (note limitations).
- Acceptance criteria:
  - When enabled, backgrounds show blur/acrylic; when disabled, standard palette.

### Epic 4 — Chat Experience (Message Bubbles)

4.1 Replace monolithic `QTextEdit` with message list
- Description: Introduce a `QListView` (or `QListWidget`) with custom `ChatMessageWidget` for User/Assistant messages, including avatars, bubble shapes, timestamp, and status.
- Files: new `widgets/chat_message.py`; `app.py` (`ChatTab` layout: replace `RichTextOutput` with message list container while keeping `RichTextOutput` for markdown rendering inside each bubble or migrate to HTML-based label).
- Acceptance criteria:
  - Each message appears as a bubble with distinct left/right alignment and avatar.
  - Long messages wrap nicely; code blocks are readable.

4.2 Streaming UX
- Description: Implement typewriter/streaming updates on the last Assistant bubble with smooth autoscroll.
- Files: `widgets/chat_message.py` (append_stream), `app.py` (`_on_delta`, `_on_finished`).
- Acceptance criteria:
  - Streaming text updates do not block UI; autoscroll stays pinned to bottom unless user scrolled up.

4.3 Empty states and skeletons
- Description: Show skeleton placeholders while thinking and tasteful empty state when no conversation exists.
- Files: `ChatTab` container and message list; small `widgets/skeleton.py`.
- Acceptance criteria:
  - When model is busy, a shimmering skeleton bubble is shown.
  - On new chat, a friendly empty state illustration/text appears.

### Epic 5 — Code Block UX

5.1 Inline code tools
- Description: For fenced code blocks, show an inline action bar: Copy, Insert to input, Expand.
- Files: `widgets/chat_message.py` (DOM hooks on code blocks), `app.py` (handlers to copy/insert), reuse existing regex from context menu.
- Acceptance criteria:
  - Hovering a code block reveals a small toolbar; clicking Copy puts code on clipboard; Insert copies to `ChatTab.input`.

5.2 Syntax highlighting polish
- Description: Improve HTML/CSS for code blocks inside bubbles (legible background, correct font, spacing).
- Files: `MarkdownRenderer` CSS in `app.py`.
- Acceptance criteria:
  - Code is easily distinguishable; horizontal scrolling when overflow occurs.

### Epic 6 — Logs Drawer & Status

6.1 Redesign logs into a drawer
- Description: Convert logs panel to a bottom drawer with severity color, monospace, and copy button.
- Files: `app.py` (`ChatTab` logs area), new buttons.
- Acceptance criteria:
  - Toggle animates open/close; log lines include color tags for warnings/errors.

6.2 Rich meta badges
- Description: Display small badges for model, temp, tokens/sec above the output area.
- Files: `app.py` (`ChatTab.refresh_info`), small badge widgets.
- Acceptance criteria:
  - Badges are compact, readable, and update per response.

### Epic 7 — DiffDialog Upgrade

7.1 Color-coded diffs
- Description: Highlight additions/deletions with background colors and gutter symbols using `difflib` or `python-diff-match-patch`.
- Files: `app.py` (`DiffDialog`), optional helper module `utils/diff.py`.
- Acceptance criteria:
  - Left/right panes show green/red highlights; a legend explains colors.

7.2 Apply/Copy ergonomics
- Description: Keep current Apply/Copy, add “Copy left/right” and “Swap view”.
- Files: `app.py` (`DiffDialog`).
- Acceptance criteria:
  - Additional buttons work; keyboard shortcuts for Apply (Enter) and Close (Esc).

### Epic 8 — Micro‑interactions & Motion

8.1 Button/hover/focus animations
- Description: Use `QPropertyAnimation` and stateful QSS transitions (where applicable) for hover/press and focus rings.
- Files: `app.py` (buttons in `ChatTab`, `SqlTab`).
- Acceptance criteria:
  - Subtle animations (150–200ms) on hover/press; focus ring animates in.

8.2 Toast transitions
- Description: Enhance `show_toast` with fade/slide and optional icon.
- Files: `app.py` (`show_toast`).
- Acceptance criteria:
  - Toast fades in/out and slightly slides; no input block; disappears automatically.

8.3 Progress polish
- Description: Replace indeterminate bar with thin animated indicator under the header.
- Files: `app.py` (`ChatTab.progress`).
- Acceptance criteria:
  - Indicator appears only when busy; looks modern and unobtrusive.

### Epic 9 — Command Palette Enhancements

9.1 Fuzzy highlight and sections
- Description: Highlight matched text, group actions into sections (Chat, SQL, View, Export).
- Files: `app.py` (`CommandPalette`).
- Acceptance criteria:
  - Filtering highlights matches; sections have headers; keyboard nav works.

9.2 Action previews
- Description: Offer small previews for some actions (e.g., “Toggle Theme” shows current state).
- Files: `app.py` (`CommandPalette`).
- Acceptance criteria:
  - Preview text/icons update as you move selection.

### Epic 10 — Accessibility, Responsiveness, and Settings

10.1 Keyboard navigation and focus order
- Description: Ensure tab order and shortcuts; visible focus for all interactive elements.
- Files: `app.py` (setTabOrder, QSS focus states).
- Acceptance criteria:
  - Tab cycles through inputs and buttons logically in both tabs.

10.2 Persist preferences
- Description: Use `QSettings` to persist palette (light/dark), stream toggle, logs drawer, font size, and window state (already partly implemented).
- Files: `app.py` (ensure all toggles persist), `config.py` (defaults).
- Acceptance criteria:
  - Relaunch restores user prefs reliably.

10.3 High‑DPI and layout
- Description: Verify scaling and spacing on Retina and different window sizes.
- Files: QSS and layout margins.
- Acceptance criteria:
  - No clipped text; controls scale gracefully.

### Epic 11 — Packaging & Docs

11.1 Update `README.md`
- Description: Document new dependencies, optional flags, and screenshots.
- Files: `README.md`.
- Acceptance criteria:
  - Clear installation steps; before/after screenshots; feature flags table.

11.2 PyInstaller configuration
- Description: Confirm packaging includes any additional assets (icons) and third‑party styles.
- Files/Commands: PyInstaller command in `README.md`; test build on macOS.
- Acceptance criteria:
  - App builds and launches; UI matches dev run.

### Epic M (Optional) — Material Look via `qt-material`

M.1 Evaluate Material theme
- Description: Add `qt-material` and apply one of the modern palettes (Oceanic/Indigo), replacing custom QSS.
- Files: `requirements.txt` (add `qt-material>=2.14`), `app.py` (theme init).
- Acceptance criteria:
  - Material theme renders consistently; can be toggled via feature flag; no style conflicts.

M.2 Component alignment
- Description: Reconcile spacing and control heights to Material guidelines.
- Acceptance criteria:
  - Buttons, inputs, and tabs match Material density; typography scale consistent.

---

## Implementation Order (Recommended)
1) Epic 0 → 1 → 2 (foundation, theme, icons)
2) Epic 3 (frameless/acrylic) — can be gated by flag
3) Epic 4 (chat bubbles + streaming) — highest visual impact
4) Epic 5–7 (code tools, logs, diff)
5) Epic 8–10 (motion, palette, a11y)
6) Epic 11 (packaging/docs)

## File‑level Checklist

- `config.py`
  - Add: `UI_USE_FLUENT`, `UI_FRAMELESS`, `UI_ACRYLIC`, `UI_ENABLE_ANIMATIONS`, tokens (accent, neutrals, radii, spacing, font sizes).
- `requirements.txt`
  - Add: `qfluentwidgets`, `qtawesome`, `qframelesswindow` (and optionally `qt-material`).
- `app.py`
  - `MainWindow`: frameless integration, custom title bar, window effects, theme hookup.
  - `apply_theme`: consume tokens; reduce hardcoded QSS; guard by flags.
  - `ChatTab`: replace output area with message list; add skeletons; inline code toolbar; improved logs drawer and badges.
  - `DiffDialog`: color diff, better controls.
  - `CommandPalette`: icons, sections, previews.
- New modules
  - `widgets/titlebar.py`: custom title bar controls.
  - `widgets/chat_message.py`: bubble widget with markdown rendering and code toolbar.
  - `widgets/skeleton.py`: simple shimmering placeholder utilities.
  - `utils/diff.py`: helpers for colorizing diffs.

## Acceptance Test Plan (Smoke)
- Theme toggle switches palettes without glitches.
- Frameless window draggable; controls work; acrylic on supported OS.
- Chat shows bubbles; streaming is smooth; autoscroll behaves.
- Code block toolbar: Copy and Insert work; Expand opens larger view.
- Logs drawer toggles with animation; severity colors render.
- Diff dialog shows colored additions/deletions; Apply and Copy behave.
- Keyboard shortcuts: Send (Cmd/Ctrl+Enter), Palette (Cmd/Ctrl+K), New Chat (Cmd/Ctrl+N), Font +/-.
- Packaging run produces consistent visuals.

## Risks & Mitigations
- Platform differences (macOS blur APIs): provide solid fallback; gate with `UI_ACRYLIC`.
- Third‑party style conflicts: ensure only one style engine active (Fluent OR Material); guard by flags.
- Performance (streaming & markdown): batch updates (already present), avoid reflowing entire view on each delta.

## Rollback
- Feature flags allow toggling off frameless/acrylic and Fluent. Retain the original QSS in `apply_theme` as fallback.


