# PLAN — Sync the fork with upstream while preserving local fixes

**Created:** 2026-07-31
**Goal:** Bring `main` up to date with `marky-editor/marky`, replay the `personal` customizations on top of it, and refresh the open upstream pull request — retiring the local changes that upstream has since superseded.

RACI: AI = Responsible, Human = Accountable.

---

## Starting state (measured 2026-07-31)

| Ref | Commit | State |
|---|---|---|
| upstream `marky-editor/marky` `main` | `93ae8ab` | current |
| `origin/main` (fork on GitHub) | `6b101d4` | 42 commits behind upstream |
| local `main` | `cc5e331` | 95 commits behind upstream; **0 commits of its own** |
| `personal` | `37b1707` | local `main` + 11 commits |
| `kevinpinscoe/fix-reload-issue` | `60c29f6` | upstream PR #14, still **open** |

**Root cause of the drift:** there is no `upstream` remote. `CLAUDE.md` states that `main` tracks the upstream fork, but `git remote -v` lists only `origin` → `github.com/kevinpinscoe/marky`. There has never been a configured path for upstream commits to arrive.

Local `main` is a strict ancestor of upstream `main`, so it fast-forwards cleanly — no merge, no conflicts.

**Scale of the upstream delta:** 95 commits, 116 files, +9301 / −4603. Materially: a six-palette colour theme system with a settings picker, theme-aware syntax highlighting, a 686-line rewrite of `index.css`, WCAG AA contrast work, accessibility (axe-core) sweeps, scroll-sync rework, and dependency upgrades.

---

## Triage of the 11 `personal` commits

| Commit | Subject | Disposition |
|---|---|---|
| `60c29f6` | fix: replace renderer reload with file-reload-from-disk action | **Rework** — conflicts with upstream's title-bar dropdown extraction and IPC contract typing. Also PR #14 |
| `2b40fd9` | feat: add markdown syntax highlighting to editor | **Drop** — upstream shipped `highlight-style.ts` and theme-aware highlighting |
| `a354c72` | docs: add RUNBOOK.md | Keep — new file, no overlap |
| `400e973` | feat: replace purple theme with neutral dark and high-contrast white text | **Drop** — upstream rewrote `index.css` and added six palettes with a picker |
| `da6c9d7` | chore: add CLAUDE.md, mise.toml, gitignore hygiene | Keep — no overlap |
| `81e226d` | personal branch: skip lint and commitlint hooks | Keep — upstream never touched `.husky/` |
| `188eaf7` | docs: document personal branch philosophy and hook bypass | Keep — **minor conflict**, upstream edited `README.md` |
| `5979120` | build.sh: build AppImage and install to KDE desktop location | Keep — no overlap |
| `87afc7c` | docs(personal): add repo assessment and bug report | Keep — new files |
| `35c1464` | docs: add PKM vault index frontmatter to RUNBOOK.md | Keep — new file |
| `37b1707` | docs: add TODO.md with open-file-by-full-path request | Keep — new file |

---

## Tasks

### Step 0 — Safety net ✅
- [x] Confirm the working tree is clean
- [x] Tag the current branch tip as `personal-pre-sync-2026-07-31` so the pre-rebase state is recoverable

### Step 1 — Wire up the missing upstream remote ✅
- [x] `git remote add upstream https://github.com/marky-editor/marky.git`
- [x] Disable the upstream push URL so nothing can be pushed to the upstream project by accident — push URL set to `DISABLED-do-not-push-to-upstream`
- [x] `git fetch upstream`

### Step 2 — Fast-forward `main` ✅
- [x] `git checkout main && git merge --ff-only upstream/main` (`cc5e331` → `93ae8ab`)
- [x] `git push origin main` — also a fast-forward, since `origin/main` is an ancestor of upstream

### Step 3 — Rebase the open pull request first ✅
Doing this before the `personal` rebase means the title-bar / IPC conflicts are resolved once, in the smallest possible scope, and the resolution can then be reused.

- [x] Rebase `kevinpinscoe/fix-reload-issue` onto the new `main` — now `b114153`
- [x] Resolve conflicts against upstream's refactored title bar and typed IPC contract — 4 conflicts: `menu.ts`, `title-bar.tsx`, `es.ts`, `pt-BR.ts`
- [x] Verify the reload action still works — typecheck, lint, 148 unit tests and 127 e2e tests all pass
- [x] `git push --force-with-lease origin kevinpinscoe/fix-reload-issue` to refresh PR #14 — PR now reports `MERGEABLE`

**Resolution notes (reusable in Step 4):**
- `menu.ts` — upstream reflowed the `forceReload` entry across multiple lines; keep upstream's formatting and drop the native `role: 'reload'` line, which is exactly what this fix removes.
- `title-bar.tsx` — upstream moved `Save` into the new `file-actions.tsx`, so the import block keeps only `RefreshCw`. The reload button still lands between Open and Save and retains its `aria-label`.
- `es.ts` / `pt-BR.ts` — purely Prettier 3.9 reflow. Keep upstream's wrapped `notice.fileNotFound` and wrap the two new keys the same way.

**Discovered during this step:** the e2e fixture launches whatever is already in `out/` and never rebuilds. `out/` was two months stale, which failed all 16 accessibility tests until rebuilt. Run `npx electron-vite build` before any e2e run.

### Step 4 — Rebase `personal` ✅
Note: `git rebase --interactive` is unavailable in this environment, so the branch was rebuilt by replaying the keep-commits onto `b114153` with `git cherry-pick`. Same result, and it makes the dropped commits explicit.

- [x] Replay the keep-commits onto `b114153` — 8 cherry-picks, zero conflicts
- [x] Drop `2b40fd9` (superseded syntax highlighting)
- [x] Drop `400e973` (superseded theme patch)
- [x] Replace stale `60c29f6` with the resolved reload commit from Step 3
- [x] Resolve the `README.md` conflict in `188eaf7` by hand — no conflict arose; upstream's README edits sat in a different region. Section order verified by hand
- [x] Confirm the result is clean — `personal` is now `d3868d2`, **9 commits** on top of upstream `93ae8ab`, every one SSH-signed

**Verified after the rebase:** `index.css` and `editor-pane.tsx` are byte-identical to upstream, confirming both dropped commits left no residue. The remaining delta against upstream is documentation, build config and the reload fix — 21 files, +566/−1.

### Step 5 — Verify — all automated checks pass; one item left for Kevin
The `personal` branch bypasses the Husky hooks, so none of this runs automatically. It must be run by hand.

- [x] `npm ci` — dependencies moved substantially (lucide-react 1.x, commitlint major, prettier 3.9, new `rehype-highlight` / `axe-core` / `codemirror-lang-mermaid`)
- [x] `npm run lint` — 0 errors, 2 warnings (both pre-existing upstream, in `i18n-context.tsx`)
- [x] `npm run typecheck` — clean
- [x] `npm run test` — 148 unit tests pass
- [x] `npm run test:e2e` — 127 pass. The Fedora/KDE font-rendering risk did **not** materialise; upstream's Linux baselines match this machine
- [x] `./build.sh` and install the AppImage — built and installed to `~/.local/bin/Marky.AppImage` at 20:49
- [ ] **Kevin:** judge whether one of upstream's six palettes delivers the neutral-dark, high-contrast look that the dropped `400e973` was hand-rolling. If none does, raise it as a new task rather than reinstating the CSS patch — that patch fought a stylesheet that no longer exists

**Gotcha found here:** the e2e fixture launches whatever is already in `out/` and never rebuilds it. A stale `out/` failed all 16 accessibility tests until rebuilt. Always run `npx electron-vite build` before `npm run test:e2e`. Worth an upstream fix.

**Also noted:** electron-builder warns that `desktopName` is not set in `package.json`, so KDE may fail to associate running windows with the desktop entry. Candidate upstream PR.

### Step 6 — Publish and document — ✅ except the tag deletion
- [x] `git push --force-with-lease origin personal` — done 2026-08-01 on Kevin's approval. `35c1464` → `3699290` (forced update), verified in sync. Ten old SHAs left `origin/personal`; all are contained in the safety tag, which was checked before the push
- [x] Update `CLAUDE.md` to document the `upstream` remote and this sync procedure — the omission that caused the drift. Done 2026-08-01: *Remotes* table (with why the upstream push URL is deliberately a non-URL, and how to restore the remote) and *Syncing with upstream* (safety tag → ff `main` → rebase the PR branch **before** `personal` → rebase `personal`, plus the cherry-pick workaround for the unavailable interactive rebase)
- [x] Update `RUNBOOK.md` if the build or test procedure changed — done 2026-08-01: the stale-`out/` gotcha as a warned Step 5, in Verification, and as a Troubleshooting row; plus a `build.sh` install step with a `cmp` verification, rollback-from-tag instructions, rows for "Text file busy" and the `desktopName` warning, and corrected Maintenance Notes
- [ ] Delete the `personal-pre-sync-2026-07-31` tag once the result is confirmed good — **still open.** It is now the only copy of the pre-sync history, including the two deliberately dropped commits `2b40fd9` and `400e973`. Do not delete it until the palette decision is settled, since `400e973` is the patch that decision concerns

---

## Where this stands — updated 2026-08-01

**The sync is complete and fully published.**

- `main` — synced to upstream `93ae8ab` and pushed.
- PR #14 — rebased onto current upstream (`b114153`), force-pushed, reports `MERGEABLE`.
- `personal` — rebuilt on upstream and **force-pushed 2026-08-01**; `origin/personal` = `3699290`, in sync with local. All automated checks pass (lint, typecheck, 148 unit, 127 e2e).
- Built and installed on the FLDW — `~/.local/bin/Marky.AppImage`, verified byte-identical to `dist/`, launched and confirmed running by Kevin.

**History was rewritten.** Any other clone must `git reset --hard origin/personal`; a plain pull will fail or produce a merge mess. The `~/todo/mac/TODO.md` entry for the macOS build carries this instruction.

**Recovery:** the tag `personal-pre-sync-2026-07-31` (`37b1707`) is now the **only** copy of the pre-sync history — it is local-only and was verified to contain the old remote tip before the force-push. It also holds the two deliberately dropped commits, `2b40fd9` and `400e973`.

**What remains — see `TODO.md`:**
1. The palette decision, deferred by Kevin on 2026-08-01. Keep the safety tag until this is settled: `400e973` is the patch in question.
2. Delete the safety tag, but only after (1).
3. Two defects for upstream: the e2e fixture running a stale `out/`, and the missing `desktopName`.

---

## Risks and decisions

- **History rewrite.** Steps 3 and 4 force-push branches that already exist on GitHub. Acceptable here — both are single-user branches — but the Step 0 tag is the only route back.
- **Appearance regression.** Dropping `400e973` means accepting upstream's appearance. This needs to be looked at, not assumed.
- **Screenshot baselines.** Upstream's e2e visual baselines were generated on their machine; local font rendering may differ.
- **README deviation.** The planning directive asks for active planning files to be listed in the README's Repository Layout section. Kevin explicitly asked that `README.md` be left alone, so `PLAN.md` and `TODO.md` are deliberately not referenced there.
