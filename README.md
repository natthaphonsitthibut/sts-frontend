# sts-frontend

React frontend for the Student Tracking System.

## Stack

- React 19
- Vite
- TypeScript
- React Router
- TanStack Query
- Zustand
- Tailwind CSS
- shadcn-style Base Components

## Setup

```bash
corepack enable
corepack prepare pnpm@10.33.2 --activate
pnpm install
```

## Development

```bash
pnpm dev
```

Default local URL:

```text
http://localhost:5173
```

## Verification

```bash
pnpm lint
pnpm build
```

## Git Hooks

This repository uses Husky, lint-staged, and commitlint.

```bash
pnpm prepare
```

Commit messages must use Conventional Commits in English:

```text
feat(auth): add admin login flow
fix(router): preserve redirect target
```
