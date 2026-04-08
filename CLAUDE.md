# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Remen

Remen is an iOS notes app built with Expo/React Native. It features zero-friction capture (voice, camera/OCR), on-device AI (LLM, embeddings, OCR via react-native-executorch), natural language search, and iCloud sync. All AI runs on-device for privacy.

## Development Commands

```bash
bun install              # Install dependencies
bun prebuild             # Generate native iOS project (required before first run)
bun prebuild:clean       # Clean rebuild of native project
bun ios                  # Run on iOS simulator
bun ios -d               # Run on physical iOS device
bun lint                 # ESLint (auto-runs on pre-commit)
bun format               # Prettier formatting
bun type-check           # TypeScript check (auto-runs on pre-commit)
bun run commit           # Interactive conventional commit helper
bun run release:add      # Add a changeset for version bumps
```

**Pre-commit hook** runs `bun type-check && bun lint --fix` automatically.

**Important:** Expo Go does not support full features (camera, iCloud, voice). Always use a development build via `bun prebuild` + `bun ios`.

## Architecture

### App Layer (`app/`)

Expo Router file-based routing with a Stack navigator (no tabs). Root layout wraps the app in: `AIProvider` > `GestureHandlerRootView` > `KeyboardProvider` > `GluestackUIProvider` > `AppInitializer` > `Stack`.

Routes: `index.tsx` (home/notes list), `notes/[id].tsx` (note detail), `edit/[id].tsx` (editor), `voice.tsx` (voice capture), `scan/` (camera + OCR), `settings/` (settings, archives, trash).

### AI System (`lib/ai/`)

On-device AI powered by `react-native-executorch`. Three models: SMOLLM 2.1 135M (LLM for titles, classification, tags), ALL-MINILM-L6-V2 (embeddings for semantic search), OCR_ENGLISH (text extraction from photos). Models are downloaded in-app on first use.

`AIProvider` (`provider.tsx`) exposes model state via React context (`useAI`, `useAILLM`, `useAIEmbeddings`, `useAIOCR`). Background processing queue (`queue.ts`) handles note classification, title generation, tag extraction, and embedding generation asynchronously.

### Database (`lib/database/`)

SQLite via `expo-sqlite` with a singleton pattern (`getDatabase()`). Database name: `remen.db`. Schema includes `notes`, `tags`, and `tasks` tables. Notes store embeddings as serialized text, have AI processing status tracking (`ai_status`, `is_processed`), and soft-delete support (`is_deleted`, `deleted_at`).

### Search (`lib/search/`)

Three search modes: keyword (SQL LIKE), semantic (cosine similarity on embeddings), and natural language with temporal parsing (`temporal-parser.ts` handles phrases like "last week", "yesterday"). `query-nlp.ts` routes NL queries to the appropriate search strategy.

### Cloud Sync (`lib/cloud/`)

iCloud backup/sync via `react-native-cloud-storage`. Handles bidirectional sync with permanent delete propagation.

### Capture (`lib/capture/`)

Voice recording via `@react-native-community/voice` with transcription. Camera/scan via `react-native-vision-camera` with on-device OCR text extraction.

### Other Key Modules

- `lib/tasks/` - Task/checklist items within notes
- `lib/reminders/` - Notification-based reminders via `expo-notifications`
- `lib/preference/` - User preferences via `@react-native-async-storage/async-storage`
- `lib/ask-notes/` - "Ask your notes" conversational feature using the LLM
- `lib/hooks/` - Shared hooks (AI processing, debounce)
- `lib/config/` - Animation config, regex patterns

### UI (`components/`)

Built with Gluestack UI + NativeWind (Tailwind CSS for RN). `components/ui/` contains Gluestack primitives. Feature components are organized by domain: `notes/`, `editor/`, `scan/`, `voice/`, `settings/`, `onboarding/`, `fab/`, `brand/`.

## Code Conventions

- **Path alias:** `@/` maps to project root (configured in tsconfig and babel)
- **Formatting:** Prettier with 4-space indent, 120 print width, double quotes, semicolons
- **Commits:** Conventional Commits enforced by commitlint. Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`, `build`, `ci`, `style`, `revert`, `wip`, `hotfix`, `release`
- **Branching:** Branch from `development`, PR into `development`. Format: `<github-username>/<type>/<description>`
- **Releases:** Managed with Changesets (`bun run release:add`)

## Agent Skills

Custom and external skills are installed in `.claude/skills/`. Read the relevant SKILL.md before working on that domain.

### Remen-Specific Skills (custom)

| Skill | When to use |
|-------|-------------|
| `remen-architecture` | Before making ANY structural changes — file conventions, module patterns, component organization |
| `remen-ai-pipeline` | When touching `lib/ai/` — prompts, queue, model lifecycle, output parsing |
| `remen-database` | When touching `lib/database/` — schema, migrations, CRUD, query patterns |
| `remen-search` | When touching `lib/search/` — semantic search, keyword search, temporal parsing, result ranking |
| `remen-executorch` | When working with react-native-executorch — model loading, API reference, lifecycle, quantization |

### External Skills (marketplace)

| Skill | Source | When to use |
|-------|--------|-------------|
| `building-native-ui` | Expo | UI components, navigation, animations, native controls |
| `native-data-fetching` | Expo | Network requests, caching, offline support |
| `upgrading-expo` | Expo | SDK upgrades, dependency resolution |
| `vercel-react-native-skills` | Vercel | React Native best practices, cross-platform patterns |
| `vercel-react-best-practices` | Vercel | React patterns, hooks, state management |
