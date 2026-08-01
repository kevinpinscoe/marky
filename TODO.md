# TODO

Human-owned task list for this fork. See `CLAUDE.md` for branch strategy. Most of the items
below come out of the 2026-07-31 upstream sync — `PLAN.md` carries the full detail, and
`CHECKPOINT.md` (untracked) is still on disk because that work is unfinished.

Prefixes: **[broken]** a defect to fix, **[decision]** something only Kevin can rule on,
**[hanging]** work started and not finished.

## Upstream sync — started 2026-07-31, not finished

- [ ] **[hanging] Restart Marky and look at the synced build.** The instance running during the
      2026-07-31 session was still the June build, so the upstream appearance has not actually been
      seen yet. `./build.sh` installed the new AppImage to `~/.local/bin/Marky.AppImage` at 20:49;
      the running process kept its old inode. This blocks the palette decision below.

- [ ] **[decision] Rule on the theme palettes.** Commit `400e973` (purple → neutral dark,
      high-contrast white text) was dropped during the rebase because upstream rewrote `index.css`
      and shipped a six-palette theme system with a settings picker. Judge whether one of those six
      delivers the neutral-dark, high-contrast look. If none does, raise it as fresh work against
      upstream's theme system — do **not** reinstate the old CSS patch, which fought a stylesheet
      that no longer exists.

- [ ] **[decision] Approve the force-push of `personal`.** `personal` was rebuilt as 10 signed
      commits on top of upstream `93ae8ab` (tip `ca3a6c5`) and every automated check passes, but
      nothing has been published. `origin/personal` still points at `35c1464`. Step 6 is
      `git push --force-with-lease origin personal`, and it is the point of no return: until it
      runs, `git reset --hard personal-pre-sync-2026-07-31` (tag → `37b1707`) restores the old
      branch exactly.

- [ ] **[hanging] Document the `upstream` remote and the sync procedure in `CLAUDE.md`.** There was
      no `upstream` remote at all before this work despite `CLAUDE.md` claiming `main` tracked the
      upstream fork — that omission is the root cause of the 95-commit drift. The remote now exists
      with its push URL set to `DISABLED-do-not-push-to-upstream`.

- [ ] **[hanging] Record the stale-`out/` e2e gotcha in `RUNBOOK.md`.** See the defect below.

- [ ] **[hanging] Delete the `personal-pre-sync-2026-07-31` tag** once the synced branch is confirmed
      good. Not before — it is the only route back.

## Defects found during the sync

- [ ] **[broken] The e2e fixture runs whatever is already in `out/` and never rebuilds it.** A
      two-month-stale `out/` failed all 16 accessibility tests until rebuilt. `npx electron-vite build`
      must be run before `npm run test:e2e`. Worth an upstream fix so the fixture builds itself.

- [ ] **[broken] `desktopName` is not set in `package.json`.** electron-builder warns about it, and
      without it KDE may fail to associate running Marky windows with the installed desktop entry.
      Candidate upstream PR.

## Features

- [ ] **Open a file by full path.** Typing a full path (e.g. `/home/kinscoe/notes/draft.md`) into the
      file browser should open that file directly instead of merely navigating the chooser to its
      parent directory. Marky needs a direct "open this full path" command — for example an
      *Open Path…* menu item / keyboard shortcut that prompts for a path and opens it, and/or
      path-aware handling in the existing open dialog (`src/main/ipc/document.ts`,
      `dialog.showOpenDialog`).
