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
| **Last Updated** | 2026-08-01 |
| **Last Tested** | 2026-08-01 |
| **Expected Duration** | 2–5 min (dev), 5–10 min (build), ~3 min (e2e) |
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

### Step 4 — Build and install to the KDE desktop

**Why:** `build.sh` wraps `npm run build:linux` and installs the result to fixed paths, so the KDE launcher always resolves to the newest build.

```bash
cd ~/Projects/public/marky
bash ./build.sh
```

**Expected output:** AppImage at `~/.local/bin/Marky.AppImage`, all icon sizes under `~/.local/share/icons/hicolor/<size>/apps/`, and a desktop entry at `~/.local/share/applications/marky.desktop`. The `Exec=` path never changes between runs.

**Verify the install actually replaced the old binary** — the `cp` can silently be the wrong file if a previous run failed:

```bash
cmp dist/Marky-*.AppImage ~/.local/bin/Marky.AppImage && echo "installed build is current"
```

**If this fails:** see the "Text file busy" row in Troubleshooting — quit Marky before rebuilding.

---

### Step 5 — Run end-to-end tests

**Why:** Playwright drives a real Electron instance. This is the only check that exercises the packaged app rather than the source.

> ⚠️ **The e2e fixture launches whatever is already in `out/` and never rebuilds it.** A stale `out/` silently tests an old build. On 2026-07-31 a two-month-old `out/` failed all 16 accessibility tests until it was rebuilt — the failures pointed at the tests, not at the real cause. **Always rebuild first.**

```bash
cd ~/Projects/public/marky
npx electron-vite build   # MANDATORY — refreshes out/ before the fixture reads it
npm run test:e2e
```

**Expected output:** 127 tests pass.

**If accessibility tests fail en masse:** you almost certainly skipped the rebuild. Re-run `npx electron-vite build` and try again before investigating anything else.

---

## Verification

```bash
cd ~/Projects/public/marky
npm run lint
npm run typecheck
npm test                  # 148 unit tests
npx electron-vite build   # before e2e — see Step 5
npm run test:e2e          # 127 e2e tests
```

**Success criteria:** No type errors; 148 Vitest unit tests and 127 Playwright e2e tests pass. `npm run lint` reports 0 errors (2 pre-existing upstream warnings in `i18n-context.tsx` are expected).

> The `personal` branch bypasses the Husky hooks entirely, so **none of this runs automatically there.** It must be run by hand before trusting a `personal` build.

---

## Rollback Procedure

1. Close the Electron window
2. `git checkout main` to return to the stable branch

**Rolling back a bad upstream sync:** each sync tags the pre-sync tip as `personal-pre-sync-<date>` before rewriting anything. While that tag exists and the rewritten branch has not been force-pushed, `git reset --hard personal-pre-sync-<date>` restores `personal` exactly. See `CLAUDE.md` → "Syncing with upstream". Once the force-push lands, the tag is the only remaining copy — do not delete it until the new build is confirmed good.

---

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Electron window opens but editor is blank | Renderer crashed on startup | Check terminal for Vite/React errors |
| `npm run dev` opens empty document after Ctrl+R | Old bug — renderer reload wipes Zustand state | Fixed via the `file:reload` IPC action; the fix is on `personal` and is upstream PR #14 |
| AppImage won't launch on Fedora | FUSE not available | Run with `--no-sandbox` flag or install `fuse`: `sudo dnf install fuse` |
| `electron-builder` fails with code signing error | No signing cert configured | Expected on local Linux builds; safe to ignore for personal use |
| **All 16 accessibility e2e tests fail at once** | **Stale `out/` — the Playwright fixture never rebuilds it** | Run `npx electron-vite build`, then re-run `npm run test:e2e`. Do not debug the tests first; this is the cause almost every time |
| `build.sh` install fails with `cp: Text file busy` | Marky is running from `~/.local/bin/Marky.AppImage`, so the target is in use | Quit Marky and re-run. If it must be replaced while running, `rm` the target first, then copy — the running instance keeps its old inode and is unharmed |
| KDE does not associate Marky windows with its launcher icon | `desktopName` is not set in `package.json`; electron-builder warns about this on every build | Known open issue — see `TODO.md`. Fix is `desktopName` plus `linux.syncDesktopName: true`. Candidate upstream PR |

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
- **Fork drift:** `main` tracks `marky-editor/marky` and drifts silently if nobody fetches `upstream`. It reached 95 commits behind before the 2026-07-31 sync. Check `git log --oneline main..upstream/main | wc -l` periodically; the sync procedure is in `CLAUDE.md`
- **Active branch:** `personal` — Kevin's long-running customization branch, rebased onto upstream `93ae8ab` on 2026-07-31
- **Open upstream PR:** #14 (`kevinpinscoe/fix-reload-issue`) — the `file:reload` fix. Rebased onto current upstream and reports `MERGEABLE`
- **Open tasks:** see `TODO.md` in the repo root
