# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Branch strategy

The `personal` branch is Kevin's long-running customization branch. Commits to `personal` are unrestricted — AI-generated commits are welcome here. The workflow:

- **`personal`** — all local customizations live here; commit freely
- **`main`** — tracks the upstream fork (`marky-editor/marky`); pull upstream updates in here, then merge or rebase `personal` on top
- Upstream fixes and improvements are submitted as PRs from short-lived branches off `main`, keeping the upstream history clean

When making commits on the `personal` branch, sign them per the SSH signing key configured globally (`git config --global gpg.format ssh`).

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
