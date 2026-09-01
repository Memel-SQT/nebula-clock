# Contributing

Thanks for taking a look. This document covers the conventions the repo
enforces automatically, so CI does not surprise you.

## Setup

```bash
pnpm install
```

Husky installs two hooks: `pre-commit` runs lint-staged (ESLint + Prettier on
staged files), and `commit-msg` runs commitlint.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) — semantic-release
derives the version number and the changelog from them, so the prefix matters.

```
feat(timer): add ultradian preset
fix(stats): count aborted sessions in focus time
docs(readme): document the desktop build
```

| Type                                   | Release |
| -------------------------------------- | ------- |
| `feat`                                 | minor   |
| `fix`, `perf`, `refactor`, `build`     | patch   |
| `feat!` or a `BREAKING CHANGE:` footer | major   |
| `docs`, `style`, `test`, `chore`, `ci` | none    |

Scopes in use: `timer`, `tasks`, `stats`, `settings`, `ui`, `core`, `web`,
`desktop`, `i18n`, `a11y`, `deps`.

## Architecture rules

These are the constraints that keep the codebase workable — please respect them:

1. **`packages/core` imports no UI framework.** No React, no DOM API beyond
   optional feature detection, nothing Electron-specific. If a feature needs
   the DOM, it belongs in `apps/web`.
2. **No business logic in components.** Components render and dispatch. Rules
   live in the state machine, the stores, or `packages/core`.
3. **No hard-coded colours.** Every colour comes from a CSS custom property in
   `packages/ui/src/tokens/tokens.css`. The Nebula desktop app's `theme.css` is
   the upstream source of truth for those values.
4. **No hard-coded user-facing strings.** Everything goes through i18n, and
   both `fr` and `en` must be updated together — a test enforces that the two
   catalogues have identical key sets.
5. **No `any` without a comment justifying it.** ESLint fails the build.
6. **The timer must stay timestamp-based.** Never accumulate elapsed time from
   tick counts; derive it from the wall clock.

## Quality gates

Run before pushing:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

`packages/core` must stay at or above **80 % coverage** (lines, branches,
functions, statements); `vitest` fails the run otherwise.

## Accessibility

Target is **WCAG 2.1 AA**. In practice:

- every interactive element is reachable and operable by keyboard;
- icon-only controls carry an `aria-label`;
- state changes that matter are announced through a live region;
- the app must remain usable at 200 % text scale and with reduced motion on.

## Adding a language

1. Add `packages/core/src/i18n/locales/<lang>/*.json` for all six namespaces.
2. Register it in `SUPPORTED_LANGUAGES` and `resources` in
   `packages/core/src/i18n/index.ts`.
3. Add the option to the language selector in `SettingsView`.

The structural parity test will tell you if any key is missing.
