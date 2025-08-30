# ChatGPT Redesign Implementation Plan

## Implementation Strategy
This plan breaks down the redesign into small, incremental edits that can be applied progressively without breaking the existing functionality.

## File-by-File Changes

### Phase 1: Core Layout Foundation

#### 1. App Shell Redesign (`app-shell.tsx`)
**Goal**: Simplify to ChatGPT's 3-column layout
- Remove right sidebar complexity for now
- Simplify left sidebar toggle logic
- Ensure clean responsive behavior
- Update wrapper classes for better containment

#### 2. Left Sidebar Unification (`left-sidebar.tsx`)
**Goal**: Merge projects and conversations into single ChatGPT-style sidebar
- Combine ProjectsSidebar and ConversationsSidebar into one component
- Add "New chat" prominent button at top
- Add unified search across projects and conversations
- Implement collapsible behavior
- Update width to match ChatGPT (260px)

#### 3. Chat Window Centering (`chat-window.tsx`)
**Goal**: Center content with max-width like ChatGPT
- Add max-width container (768px)
- Center the content horizontally
- Add subtle zebra background for message alternation
- Update empty states to match ChatGPT style
- Remove export controls from hover overlay (move to menu)

### Phase 2: Message System Redesign

#### 4. Message Item Redesign (`message-item.tsx`)
**Goal**: Match ChatGPT message bubble styling
- Redesign message containers with proper spacing
- Update avatar styling and positioning
- Add hover action buttons (copy, edit, regenerate, continue)
- Improve markdown rendering with ChatGPT-style code blocks
- Add expand/collapse for long messages
- Update role-based styling

#### 5. Chat Composer Redesign (`chat-composer.tsx`)
**Goal**: Sticky bottom composer like ChatGPT
- Redesign as sticky bottom component
- Simplify advanced controls (move to right sidebar or popover)
- Add auto-grow behavior (max 6 lines)
- Update send/stop button styling
- Add proper placeholder text
- Improve focus states and keyboard handling

### Phase 3: Enhanced Interactions

#### 6. UI Components Enhancement
**Goal**: Add missing ChatGPT-style primitives

**Files to create/update**:
- `components/ui/icon-button.tsx` - For hover actions
- `components/ui/kbd.tsx` - For keyboard shortcuts display
- Update existing button variants for ChatGPT styling

#### 7. Streaming Experience Enhancement (`lib/stream.ts`)
**Goal**: Improve streaming UX to match ChatGPT
- Add typing indicator states
- Improve scroll anchoring logic
- Add stop/regenerate state management
- Better error handling and retry logic

#### 8. Keyboard Shortcuts Implementation
**Goal**: Add ChatGPT-style keyboard shortcuts
- Update `lib/ui.ts` with new shortcuts
- Implement Cmd+K command palette
- Add Cmd+L focus composer
- Add Enter/Shift+Enter handling
- Add Escape for overlay management

### Phase 4: Responsive & Polish

#### 9. Mobile Responsiveness
**Goal**: Ensure fluid mobile experience
- Update sidebar overlay behavior
- Optimize composer for mobile
- Adjust message spacing for smaller screens
- Add touch-friendly interactions

#### 10. Theme and Animation Refinements
**Goal**: Polish animations and micro-interactions
- Update `globals.css` with ChatGPT-style animations
- Refine transition timings
- Add smooth hover states
- Improve loading states

## Detailed File Changes

### 1. App Shell (`app-shell.tsx`)

```diff
# Key changes:
- Simplify layout to 2-column (sidebar + main)
- Remove right sidebar complexity temporarily
- Update responsive behavior
- Add proper max-width containers
```

### 2. Unified Sidebar (`left-sidebar.tsx`)

```diff
# Key changes:
- Replace dual sidebar with single unified component
- Add "New chat" button at top
- Implement conversation search
- Add project switching in header
- Update width from 320px to 260px
- Add collapse/expand behavior
```

### 3. Chat Window (`chat-window.tsx`)

```diff
# Key changes:
- Add max-width container (768px)
- Center content horizontally
- Add subtle background for message separation
- Update empty state styling
- Remove floating export controls
```

### 4. Message Item (`message-item.tsx`)

```diff
# Key changes:
- Redesign message layout with proper spacing
- Update avatar positioning (32px, left-aligned)
- Add hover action buttons
- Improve code block styling with copy button
- Add expand/collapse for long content
- Update role-based colors using existing tokens
```

### 5. Chat Composer (`chat-composer.tsx`)

```diff
# Key changes:
- Make sticky bottom with backdrop blur
- Simplify to essential controls only
- Add auto-grow textarea (max 6 lines)
- Update send button styling
- Improve placeholder and focus states
- Move advanced controls to separate component
```

## New Components to Create

### 1. `IconButton` Component
```typescript
// components/ui/icon-button.tsx
// For message hover actions
interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  tooltip?: string;
  variant?: 'default' | 'destructive';
  size?: 'sm' | 'md';
}
```

### 2. `Kbd` Component
```typescript
// components/ui/kbd.tsx
// For keyboard shortcuts display
interface KbdProps {
  keys: string[];
  className?: string;
}
```

### 3. `TypingIndicator` Component
```typescript
// components/chat/typing-indicator.tsx
// For streaming states
interface TypingIndicatorProps {
  isVisible: boolean;
}
```

## CSS Updates

### Global Styles (`globals.css`)
```css
/* Add ChatGPT-style message backgrounds */
.message-user {
  background: hsl(var(--primary) / 0.05);
}

.message-assistant {
  background: hsl(var(--muted) / 0.3);
}

/* Improve code block styling */
.message-code-block {
  position: relative;
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

/* Sticky composer styling */
.composer-sticky {
  position: sticky;
  bottom: 0;
  backdrop-filter: blur(8px);
  background: hsl(var(--background) / 0.8);
  border-top: 1px solid hsl(var(--border));
}
```

## Implementation Order

### Day 1: Foundation
1. ✅ Create design spec
2. ✅ Create implementation plan
3. 🔄 App shell redesign
4. 🔄 Unified sidebar implementation

### Day 2: Core Experience
5. Chat window centering
6. Message item redesign
7. Basic hover actions

### Day 3: Composer & Interactions
8. Chat composer redesign
9. Streaming improvements
10. Keyboard shortcuts

### Day 4: Polish & Responsive
11. Mobile responsiveness
12. Animation refinements
13. Testing and bug fixes

## Testing Checklist

### Functionality Tests
- [ ] All existing features work
- [ ] Project creation/switching
- [ ] Conversation management
- [ ] Message sending/streaming
- [ ] File operations (if any)

### Visual Tests
- [ ] Layout matches ChatGPT proportions
- [ ] Responsive behavior on all screen sizes
- [ ] Dark/light theme compatibility
- [ ] Color contrast meets accessibility standards

### Interaction Tests
- [ ] Keyboard navigation works
- [ ] Hover states are discoverable
- [ ] Touch interactions on mobile
- [ ] Screen reader compatibility

### Performance Tests
- [ ] No layout thrash during streaming
- [ ] Smooth scrolling in long conversations
- [ ] Fast rendering of new messages
- [ ] Memory usage remains stable

## Risk Mitigation

### Backwards Compatibility
- Keep all existing API contracts
- Preserve state management structure
- Maintain routing structure
- Don't break existing keyboard shortcuts

### Rollback Strategy
- Each phase can be reverted independently
- Feature flags for new components
- Gradual rollout via environment variables
- Fallback to current UI if issues arise

### Quality Assurance
- TypeScript strict mode compliance
- ESLint rule adherence
- Accessibility testing with screen readers
- Cross-browser testing (Chrome, Firefox, Safari)

## Success Metrics

### User Experience
- Reduced time to send first message
- Improved message readability
- Better mobile usability scores
- Increased keyboard navigation usage

### Technical Quality
- Zero new TypeScript errors
- No ESLint regressions
- Maintained or improved Lighthouse scores
- No breaking changes to public APIs

### Visual Alignment
- Close match to ChatGPT layout proportions
- Consistent spacing rhythm
- Proper use of existing color tokens
- Smooth animations and transitions
