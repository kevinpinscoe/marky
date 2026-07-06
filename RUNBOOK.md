---
title: RUNBOOK.md — Marky
tags: [runbook, operations]
vault_link: runbooks/home-kinscoe-projects-public-marky.md
source_path: /home/kinscoe/Projects/public/marky/RUNBOOK.md
---

> 📓 Indexed in the PKM knowledge vault at `runbooks/home-kinscoe-projects-public-marky.md` (symlink → this file).
# RUNBOOK.md — Marky

## Metadata

| Field | Value |
|---|---|
| **Owner** | Kevin P. Inscoe |
| **Last Updated** | 2026-06-11 |
| **Last Tested** | 2026-06-11 |
| **Expected Duration** | 2–5 min (dev), 5–10 min (build) |
| **Risk Level** | Low |
| **Repo** | `~/Projects/public/marky` |

---

## Purpose

Covers building, running, and testing the Marky Electron/React/TypeScript Markdown editor locally on a Fedora Linux desktop.

---

## When to Use This Runbook

- **Use when:** Starting the app in development, building a production AppImage, or testing a fix
- **Do NOT use when:** Deploying to CI — that uses the upstream GitHub Actions workflow

---

## Prerequisites

- [ ] Node.js and npm installed (`node --version`, `npm --version`)
- [ ] Dependencies installed: `npm install` (only needed once, or after `package-lock.json` changes)

---

## Stack

| Component | Details |
|---|---|
| **Language / Runtime** | TypeScript, Node.js, Electron 41 |
| **Frontend** | React 19, Vite, Tailwind CSS, CodeMirror 6 |
| **Build tool** | electron-vite, electron-builder |
| **External Services** | None |
| **Credentials / Secrets** | None |

---

## Step-by-Step Procedure

### Step 1 — Run in development mode

**Why:** Fastest way to see the app running with hot reload. This is the mode used to reproduce and verify bugs.

```bash
cd ~/Projects/public/marky
npm run dev
```

**Expected output:** Electron window opens with the Marky editor.

**If this fails:** Run `npm install` first, then retry.

---

### Step 2 — Build a production Linux AppImage

**Why:** Produces a portable, self-contained binary for use outside of dev mode.

```bash
cd ~/Projects/public/marky
npm run build:linux
```

**Expected output:** Files written to `dist/`:
- `Marky-<version>.AppImage` — portable single-file executable
- `linux-unpacked/` — unpacked directory build

**Running the AppImage:**
```bash
chmod +x dist/Marky-*.AppImage
./dist/Marky-*.AppImage
```

**If this fails:** Check that `electron-builder` completed without errors. The `out/` directory must be populated first by the `npm run build` step (called automatically by `build:linux`).

---

### Step 3 — Compile only (no Electron launch)

**Why:** Compiles TypeScript and bundles renderer without launching the app — useful for CI-style checks.

```bash
cd ~/Projects/public/marky
npm run build
```

**Expected output:** Compiled output written to `out/`.

---

## Verification

```bash
cd ~/Projects/public/marky
npm run typecheck
npm test
```

**Success criteria:** No type errors, all Vitest unit tests pass.

---

## Rollback Procedure

1. Close the Electron window
2. `git checkout main` to return to the stable branch

---

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Electron window opens but editor is blank | Renderer crashed on startup | Check terminal for Vite/React errors |
| `npm run dev` opens empty document after Ctrl+R | Old bug — renderer reload wipes Zustand state | Fixed in branch `kevinpinscoe/fix-reload-issue` via `file:reload` IPC action |
| AppImage won't launch on Fedora | FUSE not available | Run with `--no-sandbox` flag or install `fuse`: `sudo dnf install fuse` |
| `electron-builder` fails with code signing error | No signing cert configured | Expected on local Linux builds; safe to ignore for personal use |

---

## Logs

```bash
# Dev mode logs appear directly in the terminal running npm run dev
# Main process logs: stdout/stderr of the npm process
# Renderer logs: Electron DevTools console (Ctrl+Shift+I)
```

---

## Maintenance Notes

- **Known drift risks:** Electron version bumps may change IPC behavior or menu API
- **Active branch:** `kevinpinscoe/fix-reload-issue` — fixes renderer reload losing open file
