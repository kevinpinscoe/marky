# Bug Report: Reload Resets Editor — File Must Be Reopened Manually

**Reporter:** Kevin P. Inscoe
**Date:** 2026-06-10
**Marky version:** 0.1.1
**Platform:** Fedora 42 Linux
**Mode:** Development (`npm run dev`)

---

## Summary

Triggering the Electron Reload action (Developer menu → Reload / Ctrl+R) while a Markdown file is open
discards all editor state. The editor resets to an empty untitled document, and the previously open file
must be reopened manually.

---

## Steps to Reproduce

1. Start Marky in development mode: `npm run dev`
2. Open a saved `.md` file via File → Open
3. Leave the file open in the editor
4. From another process (e.g., an AI agent), write changes to the same file on disk
5. In Marky, click **Developer → Reload** (or press Ctrl+R) to pick up the external changes
6. Observe the editor state

---

## Expected Behaviour

After reload, Marky should re-read the currently open file from disk and display its updated content in the
editor — identical to the user having pressed File → Open on the same path again.

---

## Actual Behaviour

The editor resets to an untitled empty document (`untitled.md` with default placeholder content). The file
that was open before the reload is no longer loaded. The user must manually reopen it via File → Open.

---

## Root Cause

Electron's native `role: 'reload'` (wired in `src/main/menu.ts:136`) calls `webContents.reload()`, which
performs a **full renderer-process restart** — equivalent to a browser page refresh. On restart, the React
app re-initialises from scratch. The Zustand workspace store (`src/renderer/src/features/workspace/store.ts:27`)
always starts from a hardcoded `untitledDocument` value; there is no persistence of the open file path
across renderer restarts, so the previously loaded file is irrecoverably lost.

---

## Affected Files

| File | Relevance |
|---|---|
| `src/main/menu.ts:131–145` | Developer submenu wires `role: 'reload'` to Ctrl+R (dev mode only) |
| `src/renderer/src/features/workspace/store.ts:21–29` | Store always initialises from `untitledDocument` with no path |
| `src/shared/types.ts` | `MenuAction` union — no `file:reload` action exists |
| `src/shared/contracts.ts` | IPC channels — no `document:reload` channel exists |

---

## Proposed Fix Direction

Replace the Electron native `role: 'reload'` with a custom `file:reload` `MenuAction` that:

1. Reads the current file path from the workspace store
2. If a path exists, calls `window.marky.openDocumentFromPath(path)` and updates the store in-place
3. If no file is open (unsaved document), falls back to a notice telling the user there is nothing to reload

This requires:
- Adding `'file:reload'` to the `MenuAction` union in `src/shared/types.ts`
- Adding a menu item in `src/main/menu.ts` that sends `'file:reload'` via `sendAction`
- Handling `'file:reload'` in `useDocumentActions` (`src/renderer/src/features/workspace/hooks/use-document-actions.ts`)
- Exposing a reload button or keyboard shortcut (e.g., Ctrl+R or a dedicated key) to users in production — not just in dev mode
