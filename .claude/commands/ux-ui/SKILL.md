---
name: ui-ux-architect
description: "The definitive skill for designing AND building professional user interfaces. Covers the full pipeline: UX thinking, information architecture, design systems, component design, interaction patterns, accessibility, responsive strategy, dark mode, animations, and production-grade frontend code. Use whenever building, reviewing, or improving ANY user-facing interface — web apps, dashboards, chat UIs, landing pages, mobile layouts, forms, onboarding flows, modals, data tables, or any screen humans interact with. Triggers on: layout decisions, component design, color/typography choices, spacing, responsiveness, user flows, interaction design, accessibility, dark mode, design tokens, animations, styling, beautifying UI, or writing HTML/CSS/JS/React/Vue code for interfaces. Also triggers when reviewing or critiquing existing UI. This is the ONLY design skill needed — it replaces frontend-design and any UX-specific skills."
---

# UI/UX Architect

The complete system for designing and building professional interfaces. Covers thinking, designing, AND implementing. No other design skill needed.

## Process: THINK → DESIGN → BUILD → POLISH

Always follow this order. Never jump to code without steps 1-2.

---

## 1. THINK (skip only for trivial changes)

Answer before touching anything:
- **Who**: User expertise, context, device, mental state
- **What**: The #1 action on this screen. There is always exactly one.
- **Friction**: Where will users get confused, stuck, or annoyed?
- **Differentiation**: What makes this feel crafted, not generated?

Every screen has ONE primary action. Design everything around it:
```
██████████ Primary action   (60% visual weight)
████       Secondary info   (25%)
██         Tertiary/nav     (15%)
```

Rules:
- One CTA per viewport. Two CTAs = one primary (filled), one secondary (ghost)
- Group by proximity, not borders
- Every element must earn its pixel space — if removing it doesn't hurt, remove it

---

## 2. DESIGN (tokens → layout → components)

### Design Tokens

Build from tokens up, never from components down.

**Spacing (8px base)**:
```
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96
```
Use consistently. Never arbitrary values like 13px or 37px.

**Typography scale**:
```
xs: 0.75rem    sm: 0.875rem    base: 1rem    lg: 1.125rem
xl: 1.25rem    2xl: 1.5rem     3xl: 1.875rem  4xl: 2.25rem
```

**Font strategy**:
- 1 display font (personality) + 1 body font (legibility). Max 2. Maybe 3 with mono.
- NEVER: Inter, Roboto, Arial, system-ui as primary. These are invisible — they say nothing.
- Pick fonts with character. Google Fonts has 1500+ options — explore. Every project deserves its own pairing.
- Vary across projects. If you used Space Grotesk last time, don't use it again.

**Color system** (semantic, not decorative):
```
Surfaces:    bg-primary, bg-secondary, bg-elevated, bg-overlay
Text:        text-primary (87-100%), text-secondary (60%), text-tertiary (38%), text-disabled
Borders:     border-default, border-subtle, border-strong
Interactive: accent, accent-hover, accent-active, accent-disabled
Feedback:    success, warning, error, info
```

Rules:
- 4.5:1 contrast ratio for text (WCAG AA). Non-negotiable.
- 3:1 for large text and UI components
- Dominant color + sharp accent > evenly distributed palette
- Use CSS custom properties for ALL colors (enables dark mode)

### Layout

- **Mobile-first always**. Enhance for larger screens, never the reverse.
- Breakpoints: `640 / 768 / 1024 / 1280 / 1536`
- Touch targets: minimum 44×44px
- Thumb zone: primary actions in bottom-center on mobile
- No hover-dependent interactions on touch devices
- Forms: single column. Always.

### Component States

Every interactive component needs ALL of these:
```
default → hover → focus → active → disabled → loading → error → empty → skeleton
```
Missing states = amateur UI. Define them upfront.

---

## 3. BUILD (production-grade code)

### Aesthetic Direction

Before writing a single line, commit to a BOLD direction:
- Brutally minimal, maximalist, retro-futuristic, organic, luxury, playful, editorial, brutalist, art deco, soft/pastel, industrial — pick one and commit
- Match code complexity to vision: maximalist = elaborate animations; minimal = precision spacing
- What's the ONE thing someone will remember about this interface?

**CRITICAL**: Intentionality > intensity. Bold maximalism and refined minimalism both work. Timid middle-ground never does.

### Code Quality

Implement real, working, production-grade code:
- Semantic HTML (`button` not `div onClick`)
- CSS custom properties for theming
- Proper component architecture (small, single-responsibility)
- Real data handling, not just visual mockups

### Typography in Code
- Load fonts properly (`@import` or `<link>` with `display=swap`)
- Set `line-height` on every text size (1.1-1.2 for headings, 1.5-1.7 for body)
- `letter-spacing` adjustments: tighter for large text (-0.02em), wider for small caps (+0.05em)
- `max-width` on text blocks: 65-75 characters for readability

### Color in Code
- Define ALL colors as CSS variables in `:root` and `[data-theme="dark"]`
- Never hardcode hex values in components
- Use `oklch()` or `hsl()` for programmatic color manipulation
- Opacity utilities: `/10 /20 /50 /80` for layering

### Animation
- Timing: `100-150ms` micro, `200-250ms` small, `300-400ms` medium, `400-600ms` large
- Easing: `ease-out` for entrances, `ease-in` for exits, `ease-in-out` for morphs
- Respect `prefers-reduced-motion: reduce` — disable non-essential animations
- Prioritize: one orchestrated page load with staggered reveals > scattered micro-interactions
- CSS-only for HTML artifacts. Motion/Framer for React when available.

### Backgrounds & Atmosphere
- Create depth, not flatness. Gradient meshes, noise textures, geometric patterns, layered transparencies, grain overlays
- Dramatic shadows for elevation hierarchy
- Decorative elements that match the aesthetic (not generic shapes)
- Dark mode: shadows become invisible — use border-subtle + surface elevation instead

### Responsive Implementation
```css
/* Mobile-first */
.container { padding: 16px; }

/* Tablet+ */
@media (min-width: 768px) { .container { padding: 24px; } }

/* Desktop+ */  
@media (min-width: 1024px) { .container { padding: 32px; max-width: 1200px; } }
```
- Stack horizontal layouts vertically on mobile
- Side nav → bottom tab bar or hamburger on mobile
- Reduce padding proportionally, never eliminate
- Tables → card stacks on mobile

---

## 4. POLISH (the difference between good and great)

### Accessibility (non-negotiable)
- ARIA labels on icons and non-obvious controls
- Focus ring visible on keyboard navigation (`focus-visible`, not `focus`)
- Focus trap in modals, return focus on close
- `prefers-color-scheme` supported
- Skip-to-content link on complex pages
- Form labels always visible (NEVER placeholder-only)
- Error messages linked via `aria-describedby`
- Escape key closes modals/overlays

### Loading States
```
< 100ms:  nothing
100ms-1s: subtle pulse or spinner
1-5s:     skeleton screens with shimmer
5s+:      progress bar + estimate + cancel option
```
Skeleton screens > spinners. Always.

### Empty States
Never blank. Every empty state is an opportunity:
- Clear explanation of what goes here
- Primary action to get started
- Friendly, not robotic

### Error States
- Inline near the problem (not toast for form errors)
- Specific: "Email must include @" not "Invalid input"
- Suggest the fix when possible
- Red but not alarming — error icon + text-error color

### Dark Mode
- CSS custom properties for ALL colors (already established in tokens)
- Surfaces get LIGHTER as elevation increases (opposite of light mode)
- Text at ~87% white, not pure white (reduces eye strain)
- Shadows invisible in dark → use border-subtle + bg-elevated
- Images: `filter: brightness(0.9)` for comfort
- Test every screen, every state, both modes

### Micro-interactions
- Button press: subtle scale(0.98) + darken
- Toggle: smooth slide with color transition
- Input focus: border color + subtle ring glow
- Card hover (desktop): lift + shadow increase
- Success: brief checkmark animation or green flash
- Delete: brief shake or red flash before confirmation

---

## Anti-Patterns (reject on sight)

- Placeholder-only form labels
- Horizontal scroll on mobile (except deliberate carousels)
- Modals that can't be ESC-closed
- Disabled buttons with no explanation
- Toast for critical errors (use inline)
- Auto-playing media with sound
- Fixed headers > 60px on mobile
- Text on images without scrim/overlay
- Low-contrast placeholder text
- Icon-only buttons without labels or tooltips
- Forms > 7 visible fields without progressive disclosure
- Generic AI aesthetics: purple gradients, Inter/Roboto everywhere, cookie-cutter layouts
- Same font/palette/layout across different projects

---

## Decision Framework

When choosing between design options:
1. **Usability** — can they do the thing?
2. **Accessibility** — can ALL of them do the thing?
3. **Clarity** — is it obvious how?
4. **Aesthetics** — does it feel intentional?
5. **Delight** — does it surprise or satisfy?

Never sacrifice 1-3 for 4-5.

---

## Reference

For detailed component patterns (chat, forms, cards, nav, buttons, modals, tables, loading, notifications, onboarding), see `references/component-patterns.md`. Load it when designing specific components.
