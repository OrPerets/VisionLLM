# ChatGPT-Inspired UI/UX Redesign Specification

## Overview
This document outlines the redesign of VisionLLM's frontend to match ChatGPT's core layout, ergonomics, and micro-interactions while preserving the existing color palette and branding.

## Design Principles
- **Visual Parity**: Match ChatGPT's layout, spacing rhythm, typography scale, and message density
- **Interaction Parity**: Replicate composer behaviors, streaming UX, message actions, and smooth autoscroll
- **Brand Preservation**: Use existing color tokens without introducing new hex values
- **Accessibility**: Maintain keyboard navigation, focus states, and screen reader support
- **Responsiveness**: Ensure fluid behavior across mobile, tablet, and desktop

## Component Mapping

### Current → ChatGPT-Inspired Equivalent

| Current Component | ChatGPT Equivalent | Key Changes |
|-------------------|-------------------|-------------|
| `app-shell.tsx` | ChatGPT main layout | Simplified 3-column layout (sidebar, main, optional right) |
| `left-sidebar.tsx` | ChatGPT left sidebar | Single unified sidebar with "New chat", conversation list, search |
| `chat-window.tsx` | ChatGPT chat surface | Centered max-width container with zebra background |
| `chat-composer.tsx` | ChatGPT composer | Sticky bottom with auto-grow, Stop/Regenerate states |
| `message-item.tsx` | ChatGPT message bubbles | Clear role separation, hover actions, markdown rendering |

## Layout Specifications

### Sidebar (Left)
- **Width**: 260px desktop, 320px when expanded, overlay on mobile
- **Content**: 
  - "New chat" button (prominent, primary color)
  - Search/filter input
  - Conversation list (grouped by recent/pinned)
  - Collapse button for mobile
- **Behavior**: 
  - Collapsible on desktop
  - Overlay on mobile with backdrop
  - Keyboard navigation support

### Main Chat Area
- **Max Width**: 768px centered content
- **Background**: Subtle zebra stripes alternating by message role
- **Padding**: 16px horizontal on mobile, 24px on desktop
- **Scroll**: Smooth autoscroll when at bottom, sticky scroll when user scrolls up

### Message Container
- **Max Width**: 100% of chat area (768px max)
- **Spacing**: 12px between messages, 24px between different speakers
- **Avatar**: 32px circles, left-aligned for consistent spacing
- **Content**: Generous line-height (1.6), clear typography hierarchy

### Composer
- **Position**: Sticky bottom with backdrop blur
- **Width**: Match main chat area max-width
- **Height**: Auto-grow from 44px to max 160px (6 lines)
- **States**: Default → Typing → Streaming (with Stop) → Complete (with Regenerate)

## Interaction Details

### Streaming Behavior
- **Typing Indicator**: Subtle animated dots while waiting
- **Token-by-token**: Smooth character reveal with cursor
- **Scroll Anchoring**: Stick to bottom if user hasn't scrolled up
- **Stop Button**: Prominent red button during generation
- **Regenerate**: Available after completion

### Message Actions
- **Hover**: Show action buttons on message hover
- **Copy**: Copy message content to clipboard
- **Edit**: Edit last user message (inline editing)
- **Regenerate**: Re-run assistant response
- **Continue**: Ask assistant to continue response
- **Expand/Collapse**: For long messages (>1000 chars)

### Keyboard Shortcuts
- **Enter**: Send message
- **Shift+Enter**: New line in composer
- **Cmd/Ctrl+K**: Open command palette
- **Cmd/Ctrl+L**: Focus composer
- **Escape**: Close overlays, blur composer
- **↑/↓**: Navigate conversation list when focused

### Composer Behaviors
- **Auto-resize**: Grow vertically as user types
- **Placeholder**: Context-aware hints ("Message ChatGPT", "Ask a follow-up")
- **Send Button**: Enabled only when message has content
- **Attachments**: Button for file uploads (if feature exists)

## Accessibility Notes

### Focus Management
- **Tab Order**: Sidebar → Main content → Composer → Actions
- **Focus Traps**: In dialogs and overlays
- **Skip Links**: Jump to main content, composer
- **Landmarks**: Proper ARIA roles for sections

### Screen Reader Support
- **Live Regions**: Streaming messages announced incrementally
- **Message Roles**: Clear role announcements (You, Assistant, System)
- **Action Labels**: Descriptive button labels and tooltips
- **State Changes**: Announce loading, errors, completion

### Color Contrast
- **Text**: Maintain 4.5:1 minimum contrast ratio
- **Interactive Elements**: 3:1 minimum for focus indicators
- **Error States**: Sufficient contrast for destructive actions

## Responsive Breakpoints

### Mobile (< 640px)
- Sidebar: Full-width overlay
- Main: Full-width with 16px padding
- Composer: Fixed bottom with mobile-optimized controls
- Messages: Smaller avatars (24px), tighter spacing

### Tablet (640px - 1024px)
- Sidebar: 280px fixed or collapsible
- Main: Centered with max-width constraint
- Composer: Desktop-style with touch-friendly targets

### Desktop (> 1024px)
- Sidebar: 260px default, expandable to 320px
- Main: Centered 768px max-width
- Composer: Full desktop experience with hover states

## Color Token Usage

### Semantic Mapping (Using Existing Tokens)
- **Background**: `--background` (main surface)
- **Surface**: `--card` (message containers, sidebar)
- **Border**: `--border` (separators, input borders)
- **Text Primary**: `--foreground` (main text)
- **Text Secondary**: `--muted-foreground` (timestamps, metadata)
- **Accent**: `--primary` (send button, active states)
- **Hover**: `--accent` (hover backgrounds)
- **Focus Ring**: `--ring` (focus indicators)

### Message Role Colors
- **User**: Blue accent (`--primary` with opacity)
- **Assistant**: Green accent (existing emerald tones)
- **System**: Amber accent (existing warning tones)

## Animation & Transitions

### Message Entrance
- **Initial**: `opacity: 0, y: 8px`
- **Animate**: `opacity: 1, y: 0`
- **Duration**: 200ms ease-out
- **Stagger**: 50ms delay between messages

### Composer States
- **Focus**: Subtle lift with shadow
- **Resize**: Smooth height transition
- **Send**: Loading state with spinner

### Hover Actions
- **Opacity**: 0 → 100% on hover
- **Scale**: 1.0 → 1.05 on hover
- **Duration**: 150ms ease-out

## Performance Considerations

### Message List Virtualization
- Implement for conversations >100 messages
- Maintain scroll position during virtualization
- Preserve hover states during scroll

### Streaming Optimization
- Batch DOM updates during rapid streaming
- Avoid layout thrash with fixed-width containers
- Use CSS transforms for smooth animations

### Mobile Performance
- Reduce animations on low-end devices
- Optimize touch scroll performance
- Minimize reflows during typing

## Implementation Priority

### Phase 1: Core Layout
1. App shell redesign
2. Sidebar unification
3. Main chat area centering
4. Basic message styling

### Phase 2: Interactions
1. Composer redesign
2. Streaming UX improvements
3. Message hover actions
4. Keyboard shortcuts

### Phase 3: Polish
1. Responsive refinements
2. Animation improvements
3. Accessibility enhancements
4. Performance optimizations

## Success Metrics

### Visual Alignment
- [ ] Layout matches ChatGPT proportions
- [ ] Typography scale feels consistent
- [ ] Spacing rhythm is harmonious
- [ ] Color usage follows semantic tokens

### Interaction Quality
- [ ] Composer behavior feels natural
- [ ] Streaming experience is smooth
- [ ] Message actions are discoverable
- [ ] Keyboard navigation works seamlessly

### Technical Quality
- [ ] Zero TypeScript errors
- [ ] No ESLint regressions
- [ ] Maintained accessibility score
- [ ] No performance degradation

### Cross-Platform Experience
- [ ] Mobile experience is fluid
- [ ] Tablet experience scales well
- [ ] Desktop experience feels premium
- [ ] Touch interactions are responsive
