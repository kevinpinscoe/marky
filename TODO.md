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

- [x] **Approve and perform the force-push of `personal`.** Approved by Kevin and done 2026-08-01 —
      `git push --force-with-lease origin personal`, `35c1464` → `3699290` (forced update), verified
      in sync. Ten old commit SHAs are no longer reachable from `origin/personal`; they are preserved
      locally by the tag `personal-pre-sync-2026-07-31` (`37b1707`), which was verified to contain
      the old remote tip before the push. **The history was rewritten** — any other clone of this
      repo must `git reset --hard origin/personal` rather than pull.

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

## Release workflow — build installers from `personal` (Vermilian-style)

Goal: a GitHub Actions release workflow on the `personal` branch producing **macOS (Apple
Silicon)**, **Linux x86_64 AppImage**, and **Linux arm64 AppImage** (Raspberry Pi 5 / Debian),
modelled on `kevinpinscoe/vermilian`'s `.github/workflows/release.yml`.

Estimated at 1–2 hours of authoring plus 2–4 CI round trips. Groundwork already in place: the fork
is **public**, so `ubuntu-24.04-arm` runners are free; Marky's existing `linux-build.yml` proves the
electron-builder AppImage path works in CI; and `actions/checkout`, `actions/setup-node` and
`softprops/action-gh-release` are all already in the SHA table in
`~/ai/directives/when-generating-code-or-updating-code-in-an-outside-repo.md`, which requires
SHA-pinned action refs.

Not a copy-paste from Vermilian: that repo uses **pnpm + Electron Forge** in an `app/`
subdirectory, Marky uses **npm + electron-builder** at the repo root. The job *shape* carries over
(create draft release → matrix build → publish); the build steps get rewritten.

- [ ] **[decision] Pick the release tag pattern.** Upstream's `linux-build.yml`, `windows-build.yml`
      and `flatpak.yml` all trigger on `tags: ['v*']`, and **tags are not branch-scoped** — tagging
      `v0.1.2` on `personal` fires all three upstream workflows as well, building and possibly
      releasing artifacts that were never wanted. Recommend a distinct pattern such as
      `personal-v*`. Decide before writing the workflow; everything else depends on it.

- [ ] **[decision] macOS architecture — Apple Silicon only, or Intel too?** `package.json` currently
      declares `mac.target[0].arch: ["x64", "arm64"]`, so an unmodified `npm run build:mac` builds
      both. Kevin asked for Silicon; that means overriding to `--arm64` on the CLI. Silicon-only is
      faster and yields one artifact. Note the same override trick is needed on Linux for the
      opposite reason — `linux.target[0].arch` is `["x64"]` only, so arm64 needs `--arm64` passed on
      the command line. **Prefer CLI flags over editing `package.json`**: it keeps the diff against
      upstream at zero and avoids a permanent merge conflict surface.

- [ ] **macOS install via Homebrew Cask.** The tap already exists and is reusable —
      `github.com/kevinpinscoe/homebrew-tap` is public and already carries nine casks including
      `vermilian.rb`. Adding Marky means a new `Casks/marky.rb` plus a step in the release workflow
      that rewrites it with the new version, DMG URL and SHA-256, mirroring Vermilian's
      "Update Homebrew tap (Cask)" job. Needs the `HOMEBREW_TAP_TOKEN` secret on the marky repo.
      End state matches Vermilian:
      ```bash
      brew tap kevinpinscoe/tap
      brew install --cask marky
      brew upgrade --cask marky
      ```

      > ⚠️ **Homebrew does not sign the app.** Vermilian is shipped **unsigned** — its README says
      > so plainly, and its Cask carries a `postflight` block running
      > `xattr -dr com.apple.quarantine` to strip the quarantine flag so Gatekeeper will launch it.
      > That is a *workaround for* the absence of a signature, not a signature. Real signing means
      > an **Apple Developer ID certificate (~$99/year)** plus notarization, and the certificate and
      > app-specific password stored as repo secrets. If the goal is genuinely signed builds, that
      > is a separate, paid decision — see the item below.

- [ ] **[decision] Is a real Apple Developer ID worth it?** Only this buys actual code signing and
      notarization: no Gatekeeper warning, no `xattr` workaround, no "app is damaged" dialog. Costs
      ~$99/year and adds `CSC_LINK` / `CSC_KEY_PASSWORD` / notarization secrets to the workflow.
      Without it the build needs `CSC_IDENTITY_AUTO_DISCOVERY=false` or electron-builder will try to
      sign, fail, and break the job.

- [ ] **Publish a `checksums.txt` covering every release asset.** Roughly ten lines, copied from
      Vermilian's `channels` job: `gh release download`, `sha256sum *`, `gh release upload
      --clobber`. Deferred to another day, per Kevin 2026-08-01.

- [ ] **Run the test suite in the workflow before building.** `personal` currently has **no CI at
      all** — upstream's `test.yml` triggers only on `main` and on PRs to `main`, and the Husky
      hooks are deliberately bypassed on `personal`, so nothing is checked automatically on this
      branch. Gate the release on the 154 unit tests at minimum. E2E needs
      `npx electron-vite build` first (see `RUNBOOK.md` Step 5). Deferred to another day, per Kevin
      2026-08-01.

- [ ] **Linux arm64 AppImage prerequisites.** The runner needs FUSE for `appimagetool` — Vermilian
      installs `libfuse2t64` with a fallback to `libfuse2`. Build natively on `ubuntu-24.04-arm`
      rather than cross-compiling.

## Features

- [ ] **Open a file by full path.** Typing a full path (e.g. `/home/kinscoe/notes/draft.md`) into the
      file browser should open that file directly instead of merely navigating the chooser to its
      parent directory. Marky needs a direct "open this full path" command — for example an
      *Open Path…* menu item / keyboard shortcut that prompts for a path and opens it, and/or
      path-aware handling in the existing open dialog (`src/main/ipc/document.ts`,
      `dialog.showOpenDialog`).
