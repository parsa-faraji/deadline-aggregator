# Contributing to Deadline Aggregator

Thank you for your interest in contributing! This guide covers the basics for getting started.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in required values (see [README.md](./README.md)).
4. Set up the database: `npx prisma generate && npx prisma db push`
5. Start the dev server: `npm run dev`

## Branch Workflow

- Create a feature branch from `main`: `git checkout -b feat/your-feature`
- Keep commits atomic and use [Conventional Commits](https://www.conventionalcommits.org):
  - `feat:` -- new feature
  - `fix:` -- bug fix
  - `docs:` -- documentation changes
  - `chore:` -- maintenance, config, dependencies
  - `refactor:` -- code restructuring without behavior change
  - `style:` -- formatting, whitespace
  - `test:` -- adding or updating tests
- Open a pull request against `main` when ready.

## Code Style

- **TypeScript** is required for all source files.
- **ESLint** is configured; run `npm run lint` before committing.
- **Tailwind CSS** is used for styling; avoid custom CSS unless necessary.
- Use path aliases (`@/lib/...`, `@/components/...`) for imports.
- Prefer explicit type annotations on function parameters and return types for exported functions.

## Project Conventions

- API routes use Next.js App Router conventions (`route.ts` files).
- All API endpoints check authentication via `auth()` from `@/lib/auth`.
- Database access goes through the Prisma client exported from `@/lib/db`.
- Sync logic for each source lives in its own file under `src/lib/sync/`.

## Reporting Issues

- Search existing issues before opening a new one.
- Include steps to reproduce, expected behavior, and actual behavior.
- For feature requests, describe the use case and proposed solution.

## Pull Request Checklist

- [ ] Code compiles without errors (`npm run build`)
- [ ] Linter passes (`npm run lint`)
- [ ] Changes are documented if they affect setup or usage
- [ ] Commit messages follow Conventional Commits
