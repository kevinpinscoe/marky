# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Branch strategy

The `personal` branch is Kevin's long-running customization branch. Commits to `personal` are unrestricted — AI-generated commits are welcome here. The workflow:

- **`personal`** — all local customizations live here; commit freely
- **`main`** — tracks the upstream fork (`marky-editor/marky`); pull upstream updates in here, then merge or rebase `personal` on top
- Upstream fixes and improvements are submitted as PRs from short-lived branches off `main`, keeping the upstream history clean

When making commits on the `personal` branch, sign them per the SSH signing key configured globally (`git config --global gpg.format ssh`).

### Remotes

| Remote | URL | Notes |
|---|---|---|
| `origin` | `git@github.com:kevinpinscoe/marky.git` | Kevin's fork — the only remote that is ever pushed to |
| `upstream` | `https://github.com/marky-editor/marky.git` | The upstream project — **fetch only** |

The `upstream` push URL is deliberately set to the non-URL string `DISABLED-do-not-push-to-upstream`, so `git push upstream` fails loudly instead of attempting to write to the upstream project. Do not "fix" it.

```bash
git remote -v   # verify before any sync work
```

**This remote did not exist until 2026-07-31.** `main` was described as tracking upstream but had no configured path for upstream commits to arrive, so it silently fell 95 commits behind. If `git remote -v` ever shows `upstream` missing again, that is the bug — restore it before doing anything else:

```bash
git remote add upstream https://github.com/marky-editor/marky.git
git remote set-url --push upstream DISABLED-do-not-push-to-upstream
```

### The `gh` CLI needs an explicit `--repo` here

There are two GitHub repos behind this checkout and **no default is set**, so `gh` guesses — and it
guesses `upstream`. `gh run list` will report "no runs" while CI is in fact running green on the
fork, and `gh workflow run` will try to dispatch against `marky-editor/marky` and 404. Always say
which repo you mean:

```bash
gh run list  --repo kevinpinscoe/marky --branch personal   # CI on the fork
gh pr view 14 --repo marky-editor/marky                     # PRs live upstream
```

Do not fix this with `gh repo set-default`. Either choice is wrong half the time: CI and Actions
live on the fork, pull requests live upstream. An explicit flag is unambiguous; a default is a
silent wrong answer.

### Syncing with upstream

Run in this order. Steps 3 and 4 rewrite history on already-published branches, so tag first.

```bash
# 0. Safety net — the only route back once step 4 force-pushes
git tag -a personal-pre-sync-$(date +%F) -m "pre-sync snapshot" personal

# 1. Fetch
git fetch upstream

# 2. Fast-forward main (main carries no commits of its own, so this never conflicts)
git checkout main && git merge --ff-only upstream/main && git push origin main

# 3. Rebase any open PR branch FIRST, before personal
git checkout <pr-branch> && git rebase main
git push --force-with-lease origin <pr-branch>

# 4. Rebase personal on top of the rebased PR branch
git checkout personal && git rebase <pr-branch>
git push --force-with-lease origin personal
```

Why the PR branch goes first: its conflicts against upstream are the same ones `personal` will hit, so resolving them once in the smallest scope means step 4 replays cleanly.

Notes from the 2026-07-31 sync, worth knowing before the next one:

- `git rebase --interactive` is unavailable in the AI agent environment. Rebuild the branch with `git cherry-pick` instead — same result, and it makes deliberately dropped commits explicit.
- Triage every `personal` commit against the incoming upstream delta before replaying it. Upstream may have superseded a local patch outright; reinstating one that fights a rewritten file is worse than dropping it.
- Delete the safety tag only once the result is confirmed good.

### Git hooks

The `.husky/pre-commit` and `.husky/commit-msg` hooks both check the current branch at the start and exit 0 immediately on `personal`, so lint, typecheck, and commitlint are all bypassed. On `main` and any other branch the full upstream hook chain runs: ESLint → TypeScript type-check → Commitlint (Conventional Commits format required).

### CI

| Workflow | Trigger | Runs |
|---|---|---|
| `.github/workflows/personal-ci.yml` | push/PR to `personal` | lint, typecheck, unit tests, e2e |
| `.github/workflows/personal-release.yml` | `personal-v*` tag | builds and publishes the release |
| `.github/workflows/test.yml` (upstream) | push/PR to `main` | unit tests, e2e |
| `linux-build.yml`, `windows-build.yml`, `flatpak.yml` (upstream) | `main`, and `v*` tags | platform builds |

`personal-ci.yml` and `personal-release.yml` are fork-only files and must never be sent upstream. It exists because the Husky hooks above are bypassed on `personal` and upstream's `test.yml` never triggers there — before it, nothing on this branch was checked automatically. It is also the only workflow that runs **lint and typecheck**; `test.yml` never has.

Keep it as a separate file. Adding `personal` to `test.yml`'s branch list would conflict on every future upstream sync, since `test.yml` travels back in pull requests.

Its `e2e-tests` job must keep the `npm run build` step — that is what keeps `out/` fresh and is why the stale-`out/` trap in `RUNBOOK.md` step 5 does not bite in CI.

### Cutting a personal release

```bash
git tag -s personal-v0.1.2 -m "personal release v0.1.2"
git push origin personal-v0.1.2
gh run watch --repo kevinpinscoe/marky
```

**The `personal-` prefix is load-bearing.** Tags are not branch-scoped, so a bare `v0.1.2` tag cut on `personal` would also fire upstream's `linux-build.yml`, `windows-build.yml` and `flatpak.yml`, publishing artifacts nobody asked for. `personal-v*` matches none of them. This is a deliberate, recorded deviation from the outside-repo directive's strict-semver tag rule — see `TODO.md`.

Three artifacts: macOS Apple Silicon `.dmg`, Linux x86_64 AppImage, Linux arm64 AppImage. Two things about how it gets them are easy to "fix" and break:

- **Architecture comes from CLI flags, never from `package.json`.** `linux.target[0].arch` is `["x64"]` only and `mac.target[0].arch` is `["x64","arm64"]`, so the workflow forces arm64 on for Linux and off for macOS on the command line. Editing `package.json` instead would create a permanent merge-conflict surface against upstream.
- **The version is aligned to the tag in the CI workspace only.** electron-builder names artifacts from `package.json`, not from the tag, so without that step a `personal-v0.1.2` tag ships files called `Marky-0.1.1.*`. It is deliberately not committed, for the same zero-diff reason.

The `.dmg` is unsigned and un-notarized — there is no Apple Developer ID. The generated release notes tell users to run `xattr -dr com.apple.quarantine /Applications/Marky.app`.

## What this is

Marky is an Apostrophe-inspired Markdown editor built with Electron, React, and TypeScript. It uses electron-vite for bundling, CodeMirror for editing, and a remark/rehype pipeline for live preview.

## Commands

```bash
npm run dev          # start dev server (hot-reload)
npm run build        # compile + package for current platform
npm run build:linux  # build Linux AppImage
npm run lint         # ESLint
npm run typecheck    # TypeScript type-check (no emit)
npm run format       # Prettier write
npm run check        # Prettier check (CI)
npm run test         # unit tests (vitest, run once)
npm run test:watch   # unit tests in watch mode
npm run test:e2e     # end-to-end tests (Playwright + Electron)
```

Run a single unit test file:
```bash
npx vitest run tests/unit/markdown.test.ts
```

### build.sh — build + install on Fedora KDE

`build.sh` wraps `npm run build:linux` and installs the result in a repeatable location so the KDE desktop icon always resolves:

| What | Where |
|---|---|
| AppImage | `~/.local/bin/Marky.AppImage` |
| Icons (all sizes from `build/icons/`) | `~/.local/share/icons/hicolor/<size>/apps/io.github.marky_editor.marky.png` |
| Desktop entry | `~/.local/share/applications/marky.desktop` |

Run it from the repo root: `./build.sh`. Subsequent runs overwrite the AppImage and icons in-place — the desktop entry's `Exec=` path never changes, so the KDE launcher always finds the latest build.

## Architecture

### Process layout

Marky follows the standard Electron three-process model:

| Process | Entry | Role |
|---|---|---|
| Main | `src/main/index.ts` | Node.js; file I/O, dialogs, app menu, IPC handlers |
| Preload | `src/preload/index.ts` | Bridges main ↔ renderer via `contextBridge` |
| Renderer | `src/renderer/src/main.tsx` | React SPA; all UI |

### IPC contract

All IPC channel names and the `MarkyApi` type live in `src/shared/contracts.ts`. The preload exposes them as `window.marky`. Renderer code calls `window.marky.*`; main-process handlers live in `src/main/ipc/` (one file per domain: `document`, `export`, `settings`, `window`, `locale`).

`src/shared/types.ts` holds all shared TypeScript types (`DocumentHandle`, `AppSettings`, `MenuAction`, `ViewMode`, etc.).

### Local-asset protocol

Images relative to the open document are served via a custom `local-asset://` scheme registered in `src/main/protocol.ts`. The renderer's markdown processor (`src/renderer/src/features/preview/lib/markdown.ts`) rewrites relative `src` attributes to `local-asset://asset?base=<dir>&path=<rel>` URLs, which the main process resolves — with a path-traversal guard — and serves from disk.

### State management (Zustand)

Three stores, each in their feature directory:

| Store | File | Owns |
|---|---|---|
| `useWorkspaceStore` | `features/workspace/store.ts` | Active document (path/name/content), saved-content snapshot (dirty flag), view mode, status notices |
| `useEditorStore` | `features/editor/store.ts` | CodeMirror formatting state (bold/italic/etc.), word and character counts |
| `useSettingsStore` | `features/settings/store.ts` | `AppSettings` (theme, language, fonts, PDF options, recent files), dialog open state |

Dirty detection: `selectIsDirty` compares `document.content` vs `savedContent` in `useWorkspaceStore`.

### Renderer feature layout

```
src/renderer/src/features/
  editor/       CodeMirror pane, toolbar, formatting extensions, table helpers
  preview/      remark/rehype pipeline, preview pane
  export/       HTML/PDF export, Mermaid rendering
  settings/     settings dialog, font options
  workspace/    document open/save/export actions, status bar
  titlebar/     custom title bar with file menus and view-mode switcher
  help/         help dialog
```

### i18n

`src/renderer/src/i18n/` provides English (`en`), Brazilian Portuguese (`pt-BR`), and Spanish (`es`). The `I18nProvider` wraps the app; components call `useTranslation()` to get `t(key)`. Language is auto-detected from the OS locale on first launch and stored in `AppSettings`.

### Path aliases

| Alias | Resolves to |
|---|---|
| `@renderer` | `src/renderer/src` |
| `@shared` | `src/shared` |

### Tests

- **Unit** — `tests/unit/` — vitest; test logic in `src/renderer/src/features/` and `src/shared/`
- **E2E** — `tests/e2e/` — Playwright with Electron; `fixture.ts` sets up the app instance

### Build output

`electron-vite` compiles to `out/`; `electron-builder` packages from `out/` into `dist/`. The `build:linux` target produces an AppImage.
