# Claude's Assessment of This Repository's Workflow

## What This Is

Marky is a cross-platform desktop Markdown editor built with Electron, React 19, and TypeScript. It provides a focused writing experience with a live split-pane preview, formatting toolbar, and offline HTML/PDF export without external tools like Pandoc.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server with hot reload (electron-vite)
npm run build        # Type-check and build (outputs to out/)
npm run lint         # Run ESLint
npm run typecheck    # Run tsc only
npm run format       # Auto-format with Prettier
npm run check        # Check formatting without changes
npm run test         # Run unit tests (Vitest)
npm run test:watch   # Run unit tests in watch mode
npm run test:e2e     # Run E2E tests (Playwright, requires a build first)
```

Platform builds:

- `npm run build:win`
- `npm run build:mac`
- `npm run build:linux`
- `npm run build:all`

## Architecture

Marky follows a strict **three-process boundary**:

- **`src/main/`**: Electron main process (Node.js). Owns file I/O, window lifecycle, the app menu, IPC handler registration, and a custom URI protocol for serving local assets to the renderer.
- **`src/preload/`**: Preload script. Exposes `window.marky` to the renderer through `contextBridge`, with all methods typed by `MarkyApi` in `src/shared/contracts.ts`.
- **`src/renderer/`**: React 19 renderer process (browser-safe). Node APIs are forbidden; every main-process operation goes through `window.marky.*`.

**Shared contracts** live in `src/shared/` and are imported by both main and preload. This is the only code that crosses process boundaries.

### Renderer Feature Structure

`src/renderer/src/features/` contains self-contained feature modules:

| Feature | Responsibility |
| --- | --- |
| `editor/` | CodeMirror 6 integration, formatting toolbar, and Markdown syntax actions. |
| `preview/` | Markdown-to-HTML rendering through the unified, remark, and rehype pipeline. |
| `export/` | Orchestrates HTML/PDF export: renders in the renderer, including Mermaid, and passes the result to the main process through IPC. |
| `workspace/` | Zustand store for the currently open document, dirty state, and file path. |
| `settings/` | App settings UI and Zustand store; settings are persisted to disk through IPC. |
| `titlebar/` | Custom cross-platform title bar with window controls. |
| `i18n/` | Internationalization support. |

### IPC Channel Naming

All channels are declared in `src/shared/contracts.ts` using the pattern `domain:action`, such as `document:save`, `export:pdf`, and `settings:get`. Add new channels there first, then implement the handler in `src/main/ipc/<domain>.ts` and expose it in the preload.

### Export Pipeline

HTML and PDF exports are rendered entirely inside the renderer process. React renders the preview, Mermaid diagrams are rasterized, and the resulting HTML string is sent to the main process through IPC. This keeps exports fully offline.

## Testing

- **Unit tests** (`tests/unit/`): Vitest tests for Zustand stores and utility functions. Run a single file with `npm run test:watch`.
- **E2E tests** (`tests/e2e/`): Playwright tests with an Electron fixture (`tests/e2e/fixture.ts`) that launches the built app and exposes `app` and `window` handles. Run with `npm run test:e2e` after `npm run build`.

## Commit Conventions

Commits must follow Conventional Commits, such as `feat:` and `fix:`. This is enforced by commitlint through Husky. The pre-commit hook also runs linting and type checking.
