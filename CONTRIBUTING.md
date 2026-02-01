# Contributing to Remen

Thanks for your interest in contributing. This document explains how to get set up and how we work.

## Getting started

### Prerequisites

- **Node.js 24+**
- **Bun** (package manager)
- **iOS:** Xcode and CocoaPods (for simulator or device)

See [README — Prerequisites](README.md#prerequisites) for full details.

### Setup

```bash
git clone https://github.com/moeen-mahmud/remen.git
cd remen
bun install
```

For full features (camera, iCloud, etc.) use a [development build](https://docs.expo.dev/develop/development-builds/introduction/), not Expo Go:

```bash
bun prebuild
bun ios # or bun ios -d to run on physical device
```

## Development workflow

1. **Open or create an issue** — Bug reports, feature requests, and improvements use our [issue templates](.github/ISSUE_TEMPLATE/). Check existing issues first.
2. **Branch** — Create a branch from `development` (follow this convention: `<your-github-username>/fix/voice-crash`, `<your-github-username>/feat/export-notes`).
3. **Make changes** — Follow the code style and run checks (see below).
4. **Commit** — Use [Conventional Commits](#commit-messages). Husky runs lint and commit-msg checks.
5. **Push and open a PR** — Target the `development` branch and fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/) and [Commitlint](https://commitlint.js.org/).

**Format:** `type: subject`

**Types:** see commitlint configuration

**Examples:**

- `feat: add export to PDF`
- `fix: correct semantic query on empty DB`
- `docs: update CONTRIBUTING setup`
- `chore: bump react-native-executorch`

You can use the interactive committer:

```bash
bun run commit
```

## Code style

- **Formatting:** [Prettier](.prettierrc) (4 spaces, 120 print width, double quotes).
- **Linting:** ESLint (Expo config).
- **Types:** TypeScript; no `any` unless justified.

**Commands:**

| Command           | Description        |
| ----------------- | ------------------ |
| `bun format`      | Format with Prettier |
| `bun lint`       | Run ESLint         |
| `bun type-check` | TypeScript check   |

Run these before pushing. Pre-commit hooks will also run checks.

## Pull requests

- Base branch: **development**
- Fill in the PR template (description, type of change, related issue, checklist).
- Keep changes focused; split large work into smaller PRs when possible.
- For UI changes, add screenshots or a short note in the PR.

## Reporting bugs and suggesting ideas

- **Bugs:** [Bug report template](.github/ISSUE_TEMPLATE/1-bug-report.md) — include steps to reproduce, expected vs actual behavior, and environment (iOS version, device/simulator).
- **Features:** [Feature request template](.github/ISSUE_TEMPLATE/2-feature-request.md).
- **Improvements:** [Improvement template](.github/ISSUE_TEMPLATE/3-improvement.md) for UX, performance, or code improvements.

## Releases

Releases are managed with [Changesets](https://github.com/changesets/changesets). If your PR has user-facing or dependency changes, a maintainer may ask you to add a changeset:

```bash
bun run release:add
```

## License

By contributing, you agree that your contributions will be licensed under the same [AGPL-3.0](LICENSE) license as the project.
