# TODO

Human-owned task list for this fork. See `CLAUDE.md` for branch strategy. Most of the items
below come out of the 2026-07-31 upstream sync — `PLAN.md` carries the full detail, and
`CHECKPOINT.md` (untracked) is still on disk because that work is unfinished.

Prefixes: **[broken]** a defect to fix, **[decision]** something only Kevin can rule on,
**[hanging]** work started and not finished.

## Upstream sync — started 2026-07-31, not finished

- [x] **Restart Marky and look at the synced build.** Done 2026-08-01 — rebuilt via `bash ./build.sh`
      and reinstalled to `~/.local/bin/Marky.AppImage` (verified byte-identical to
      `dist/Marky-0.1.1.AppImage`), then launched and confirmed running by Kevin.

- [ ] **[decision] Rule on the theme palettes.** *Deferred by Kevin on 2026-08-01 — he ran the new
      build, is content with the current appearance for now, and is too busy to judge it properly.
      Still open on purpose.* Commit `400e973` (purple → neutral dark, high-contrast white text) was
      dropped during the rebase because upstream rewrote `index.css` and shipped a six-palette theme
      system with a settings picker. Judge whether one of those six delivers the neutral-dark,
      high-contrast look. If none does, raise it as fresh work against upstream's theme system — do
      **not** reinstate the old CSS patch, which fought a stylesheet that no longer exists.

      Findings from 2026-08-01 to save re-deriving them: `~/.config/marky/settings.json` has
      `"theme": "dark"` but no `colorTheme` key, so the effective palette is the default,
      **amethyst**. In dark mode all six palettes share one formula — `--background: <hue> 14% 12%`
      with an identical `--foreground: 60 30% 96%` — so they are near-neutral charcoals that differ
      only in hue; the purple `400e973` fought was the *light* theme (`264 58% 97%`). The exception
      is **sapphire** (`210 15% 2%`), by far the highest contrast of the six and the one most likely
      to settle this. The palette hue really shows in the accents (`--primary: 250 100% 75%`), so
      judge buttons and links separately from the background.

- [ ] **[decision] Approve the force-push of `personal`.** `personal` was rebuilt as 10 signed
      commits on top of upstream `93ae8ab` (tip `ca3a6c5`) and every automated check passes, but
      nothing has been published. `origin/personal` still points at `35c1464`. Step 6 is
      `git push --force-with-lease origin personal`, and it is the point of no return: until it
      runs, `git reset --hard personal-pre-sync-2026-07-31` (tag → `37b1707`) restores the old
      branch exactly.

- [x] **Document the `upstream` remote and the sync procedure in `CLAUDE.md`.** Done 2026-08-01 —
      added a *Remotes* table (including why the `upstream` push URL is deliberately broken) and a
      *Syncing with upstream* procedure covering the safety tag, the PR-branch-before-`personal`
      ordering and why, and the cherry-pick workaround for the unavailable interactive rebase.

- [x] **Record the stale-`out/` e2e gotcha in `RUNBOOK.md`.** Done 2026-08-01 — added as a warned
      Step 5 (`npx electron-vite build` is mandatory before `npm run test:e2e`), in the Verification
      block, and as a Troubleshooting row. Also added Step 4 for `build.sh`, rollback-from-tag
      instructions, and rows for "Text file busy" and the `desktopName` warning.

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
