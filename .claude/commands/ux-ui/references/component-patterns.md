# Component Patterns Reference

Detailed implementation patterns for common components. Load when designing specific UI elements.

---

## Chat Interfaces

### Messages
```
User:       right-aligned, accent bg, white text, rounded-2xl rounded-tr-sm
Assistant:  left-aligned, surface bg, border-subtle, rounded-2xl rounded-tl-sm
System:     center, no bubble, text-tertiary, text-sm
Avatar:     32px circle, left of assistant messages
Timestamps: show on hover or after 5+ minute gap
```

### Chat Input
- Auto-resize textarea: min 1 row, max 4, `Shift+Enter` newline, `Enter` send
- Send button: disabled+faded when empty, accent when content exists
- Character counter if limit exists

### Chat Behaviors
- Auto-scroll on new message UNLESS user scrolled up (reading history)
- "New messages ↓" floating pill when scrolled up + new messages arrive
- Optimistic UI: show user message immediately, typing indicator for response
- Typing indicator: 3 dots with staggered bounce animation
- Option buttons (A/B/C/D): full-width stack on mobile, 2-col grid on desktop

### Progress in Chat
- Thin progress bar below header (not inside chat area)
- "Question X of Y" in header subtitle
- Don't clutter the conversation with progress elements

---

## Forms

### Inputs
```
Default:    border-subtle, bg-primary
Focus:      border-accent, ring-2 ring-accent/20, label color → accent
Error:      border-error, ring-2 ring-error/20, error msg below
Disabled:   opacity-50, cursor-not-allowed
Success:    border-success (brief flash on validation pass)
```

### Labels & Validation
- Labels: ALWAYS visible, above input, left-aligned
- Required: red asterisk OR "(required)" text
- Errors: below input, red, with icon, specific ("Must be at least 8 characters")
- Show errors on blur (field) or submit (form). Clear when user corrects.

### Layout
- Single column. Always. Two-column forms are slower.
- Max 7 visible fields. Progressive disclosure for more.
- Related fields grouped with subtle section headers
- Actions: primary full-width on mobile, right-aligned on desktop

### Special Inputs
- Password: show/hide toggle, strength indicator
- Date: native date picker + manual fallback
- Select: custom styled but keyboard accessible
- File upload: drag zone + click, preview on selection, progress bar on upload

---

## Cards

```
Container:  bg-elevated, border-subtle, rounded-xl, overflow-hidden
Padding:    16px body, 12px header/footer
Shadow:     shadow-sm default
Hover:      shadow-md + translateY(-2px) if clickable (200ms ease)
Selected:   accent border-2 or accent bg tint
Loading:    skeleton pulse matching content layout
Empty:      dashed border + placeholder message
```

### Card Content
- Image/media at top (full-bleed, no padding)
- Title: text-lg, font-semibold, 1-2 lines max (truncate with ellipsis)
- Description: text-sm, text-secondary, 2-3 lines max
- Meta: text-xs, text-tertiary, bottom
- Actions: bottom-right, icon buttons or text links

---

## Navigation

### Top Nav (Desktop)
- Sticky, max 64px height, bg-primary + border-bottom or shadow-sm
- Logo left, primary nav center or right, user avatar far right
- Active link: accent color + bottom border (2-3px)

### Top Nav (Mobile)
- Sticky, max 56px, hamburger left or right
- Menu opens as full-screen overlay or slide-in drawer
- Close with X, Escape, or backdrop click

### Bottom Tab Bar (Mobile)
- Fixed bottom, 5 items max
- Icon (24px) + label (10-11px) always visible
- Active: accent color. Inactive: text-tertiary
- Safe area padding for notched devices (`env(safe-area-inset-bottom)`)

### Sidebar
- 240-280px expanded, 64px collapsed
- Hover shows labels when collapsed (tooltip)
- Active: accent bg tint + left border accent (3px)
- Section groups with text-xs uppercase headers
- Collapse to overlay on mobile (slide from left, backdrop)

---

## Buttons

### Hierarchy
```
Primary:    bg-accent text-white              → Main CTA
Secondary:  border-accent text-accent         → Alternative
Tertiary:   no border, text-accent            → Subtle action
Danger:     bg-error text-white               → Destructive
Ghost:      no bg, text-secondary, hover:bg   → Minimal
```

### Sizes
```
sm:  h-8  px-3 text-sm gap-1.5   (toolbars, compact)
md:  h-10 px-4 text-sm gap-2     (default)
lg:  h-12 px-6 text-base gap-2   (hero, prominent)
```

### States
- Hover: darken 10% (light) or lighten 10% (dark)
- Active: scale(0.98) + darken 15%
- Focus: ring-2 ring-accent/40 ring-offset-2 (keyboard only via `focus-visible`)
- Disabled: opacity-50, no pointer events. Tooltip explaining why.
- Loading: spinner (16px) replacing or beside text, disabled state

### Icon Buttons
- Square: same height/width as size variant
- Always have `aria-label`
- Tooltip on hover (300ms delay)

---

## Modals & Dialogs

### Structure
```
Backdrop:  bg-black/50 (light) or bg-black/70 (dark)
Container: bg-primary, rounded-2xl, shadow-2xl, max-w-md/lg/xl
Header:    title + optional subtitle + X button, border-bottom
Body:      scrollable, padded (24px)
Footer:    action buttons, border-top, right-aligned
```

### Behavior
- Close: X button + Escape + backdrop click
- Focus trap: Tab cycles within modal
- Return focus to trigger element on close
- Animate: fade backdrop (200ms) + scale container from 0.95 (250ms)
- Prevent body scroll when open (`overflow: hidden` on body)

### Confirmation Dialogs
- Title: clear action ("Delete this item?")
- Body: consequence ("This cannot be undone.")
- Cancel (secondary) left, Confirm (danger or primary) right
- Destructive confirm: require typing to confirm for critical actions

---

## Tables & Data

### Desktop Table
- Sticky header, alternate row bg (subtle)
- Sortable: click header → arrow indicator
- Hover row highlight
- Actions: far-right column, icon buttons or "..." dropdown
- Pagination: bottom, showing "1-10 of 234"
- Empty: full-width row "No results found" + suggestion

### Mobile: Card Stack
- Each row → card with key-value pairs
- Most important field as card title
- Actions: button at bottom of card or swipe gestures
- Filter/sort controls above the stack

### Data Formatting
- Numbers: right-aligned, monospace font
- Dates: relative ("2 hours ago") in lists, absolute in detail views
- Status: colored dot + label (not color alone — accessibility)
- Currency: locale-formatted with symbol
- Truncation: ellipsis with tooltip for full text

---

## Loading & Progress

### Skeleton Screens
- Match actual content layout exactly
- Pulse animation: `opacity 0.4↔1`, 1.5s cycle
- Rounded corners matching real elements
- Show 2-3 rows/cards, not just one

### Progress
```
Determinate:    bar with % or "Step 2 of 5"
Indeterminate:  bar with sliding highlight or spinner
Stepper:        numbered circles — completed(✓)/current(filled)/upcoming(outline)
```

### Optimistic Updates
- Show result immediately in UI
- Subtle "Saving..." in status bar or near action
- Revert + error toast on failure
- Never block UI for background saves

---

## Notifications

### Toasts
- Position: top-right (desktop), top-center (mobile)
- Auto-dismiss: 4s success/info, persist for errors
- Max 3 stacked, newest on top
- Swipe or X to dismiss
- Types: success ✓ green, error ✕ red, warning ⚠ amber, info ℹ blue

### Inline Alerts
- Full-width within content area
- Left border accent (4px) matching type color
- Icon + title (bold) + description
- Optional dismiss X or action link
- Preferred over toasts for: form errors, empty states, important notices

---

## Onboarding

### Setup Flows
- Max 3-5 steps
- Horizontal stepper at top
- Back always available
- "Skip for now" on non-critical steps
- Celebration on completion (subtle checkmark with scale animation)
- Single-column, generous spacing, minimal distractions

### First-Run
- Progressive: reveal features as user encounters them
- Tooltip tours: 3-5 stops max, dismissable, position-aware
- Empty states as onboarding: "No items yet. Create your first one →"
- Never front-load all information
