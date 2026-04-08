---
name: remen-architecture
description: Remen codebase architecture — file structure conventions, module patterns, component organization, and coding standards. Must-read before making any structural changes.
version: 1.0.0
---

# Remen Architecture & Conventions

Remen is an Expo SDK 54 / React Native iOS notes app. This skill ensures you maintain the existing architecture.

## Project Structure

```
app/                    # Expo Router file-based routes (Stack navigator, no tabs)
  _layout.tsx           # Root: AIProvider > GestureHandlerRootView > KeyboardProvider > GluestackUIProvider > AppInitializer > Stack
  index.tsx             # Home (notes list + inline editor + FAB)
  voice.tsx             # Voice capture screen (thin wrapper)
  notes/[id].tsx        # Note detail (read-only)
  edit/[id].tsx         # Note editor
  scan/                 # Camera + scan flow
  settings/             # Settings, archives, trash

components/             # UI components organized by domain
  ui/                   # Gluestack UI primitives (DO NOT modify these)
  notes/                # Notes list, card, detail, search
  editor/               # Rich text editor
  scan/                 # Camera, scan review
  voice/                # Voice recording UI
  settings/             # Settings screens
  onboarding/           # First-launch flow
  fab/                  # Floating action button
  brand/                # Logo, branding elements
  app-initializer.tsx   # DB init, model loading, notifications, onboarding gate
  model-download-overlay.tsx  # Model download progress UI

lib/                    # Business logic (NO React components here)
  ai/                   # On-device AI (see remen-ai-pipeline skill)
  database/             # SQLite via expo-sqlite
  search/               # Semantic + keyword + temporal search
  capture/              # Voice + scan capture logic
  cloud/                # iCloud sync
  tasks/                # Task/checklist parsing
  reminders/            # expo-notifications reminders
  preference/           # AsyncStorage preferences
  hooks/                # Shared hooks (NOT in components/)
  config/               # Animation config, regex patterns, UI constants
  consts/               # App-wide constants
  theme/                # Theme hooks
  utils/                # Utility functions
  ask-notes/            # LLM-based query interpretation (deprecated)

hooks/                  # App-level hooks (use-keyboard-animation, use-selection-mode)
```

## Hard Rules

### File Organization
- `app/` routes are THIN wrappers — they render a component from `components/` and nothing else.
- Business logic lives in `lib/`, never in `app/` or `components/`.
- `components/` are organized by domain, not by type (no `components/buttons/` or `components/modals/`).
- `lib/` modules export via barrel files (`index.ts`).
- Types live next to their module: `database.types.ts`, `ai.types.ts`, `search.types.ts`.

### Path Alias
- `@/` maps to project root. Use `@/lib/...`, `@/components/...`, `@/hooks/...`.
- Configured in both `tsconfig.json` and `babel.config.js`.

### Styling
- NativeWind (Tailwind CSS for React Native) via `className` prop.
- Gluestack UI for primitives (`components/ui/`). DO NOT modify generated Gluestack files.
- Tailwind config in `tailwind.config.js`.
- Global CSS in `global.css` (minimal, mostly Tailwind directives).
- Theme via `lib/theme/use-theme.ts`.

### TypeScript
- Strict mode enabled.
- No `any` unless justified.
- Types co-located with their module.

### Code Style
- Prettier: 4-space indent, 120 print width, double quotes, semicolons.
- ESLint: Expo config + Prettier integration.
- Pre-commit hook: `bun type-check && bun lint --fix`.

### Git & Releases
- Branch from `development`, PR into `development`.
- Branch format: `<github-username>/<type>/<description>`.
- Conventional Commits enforced by commitlint.
- Releases via Changesets (`bun run release:add`).

### Patterns
- Database is a singleton (`getDatabase()` in `lib/database/database.ts`).
- AI queue is a singleton (`aiQueue` in `lib/ai/queue.ts`).
- Preferences via AsyncStorage (`lib/preference/preferences.ts`).
- Navigation via expo-router (`router.push()`, `router.back()`).
- Haptic feedback on user actions (use `expo-haptics`).

## When Adding New Features
1. Create the logic module in `lib/<domain>/`.
2. Create types file: `lib/<domain>/<domain>.types.ts`.
3. Create UI components in `components/<domain>/`.
4. If it needs a route, add a thin wrapper in `app/`.
5. Export from barrel file.
6. Follow existing patterns — read 2-3 similar modules before writing new code.
