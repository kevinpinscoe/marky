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

**Written 2026-08-02 — `.github/workflows/personal-release.yml`.** Three jobs: `create-release`
(one idempotent draft, pre-created to stop the matrix racing to make competing drafts), `build`
(a three-leg matrix on `ubuntu-24.04`, `ubuntu-24.04-arm` and `macos-14`), and `publish` (promote
the draft). Uploads go through `gh release upload --clobber` rather than electron-builder's
`--publish`, so the pre-created draft is always the target.

Not a copy-paste from Vermilian: that repo uses **pnpm + Electron Forge** in an `app/`
subdirectory, Marky uses **npm + electron-builder** at the repo root. The job *shape* carried over
(create draft release → matrix build → publish); the build steps were rewritten.

**Not yet fired.** No `personal-v*` tag has been pushed, so the workflow has never run. The first
tag is the real test — see the two verifications already done below before trusting it blindly.

- [x] **[decision] Pick the release tag pattern.** **Decided by Kevin 2026-08-01: `personal-v*`.**
      Upstream's `linux-build.yml`, `windows-build.yml` and `flatpak.yml` all trigger on
      `tags: ['v*']`, and **tags are not branch-scoped** — tagging `v0.1.2` on `personal` would fire
      all three upstream workflows as well, building and possibly releasing artifacts that were never
      wanted. `personal-v*` does not match `v*`, so it fires nothing upstream.

      Concrete form: `personal-v0.1.2` — the version portion stays strict semver, only the prefix is
      added. The release workflow triggers on `tags: ['personal-v[0-9]+.[0-9]+.[0-9]+']` and must
      strip the `personal-v` prefix when deriving the version for artifact names and the Cask.

      > ⚠️ **Recorded deviation.** `~/ai/directives/when-generating-code-or-updating-code-in-an-outside-repo.md`
      > §3 requires release tags to be `vMAJOR.MINOR.PATCH` exactly and forbids non-semver tags.
      > A prefixed tag departs from that. The deviation is deliberate and scoped to this fork's
      > `personal` branch only, for the trigger-collision reason above; tags cut on `main` or on any
      > upstream PR branch still follow the directive unchanged.

- [x] **[decision] macOS architecture — Apple Silicon only, or Intel too?** **Built as Apple Silicon
      only**, per Kevin's stated ask, on the `macos-14` runner with `--mac dmg --arm64`. Changing to
      also ship Intel is one extra matrix leg (`macos-13` with `--x64`), not a rewrite.

      `package.json` declares `mac.target[0].arch: ["x64", "arm64"]`, so an unmodified
      `npm run build:mac` builds both; the CLI narrows it. The same override trick is used on Linux
      for the opposite reason — `linux.target[0].arch` is `["x64"]` only, so arm64 is forced on with
      `--arm64`. **CLI flags, never edits to `package.json`**: it keeps the diff against upstream at
      zero and avoids a permanent merge conflict surface.

      **Verified 2026-08-02, because this was the assumption most likely to be wrong.** Read
      `node_modules/electron-builder/out/builder.js`: when a target type is given on the CLI, the
      arch list is built from the CLI flags and the config's arch list is never consulted. Then
      built it for real on this x86_64 host — `dist/Marky-0.1.1-arm64.AppImage`, with `file`
      reporting "ELF 64-bit LSB executable, ARM aarch64".

- [ ] **macOS install via Homebrew Cask.** *Deliberately left out of the release workflow written
      on 2026-08-02.* Two reasons: it is a separate deliverable from "build the three artifacts", and
      `gh secret list --repo kevinpinscoe/marky` returns **empty** — `HOMEBREW_TAP_TOKEN` is not set
      on this repo, so a Cask step would fail on the first release. Set the secret first:
      ```bash
      gh secret set HOMEBREW_TAP_TOKEN --repo kevinpinscoe/marky --body "$(gh auth token)"
      ```
      Then the Cask step drops into the `publish` job, modelled on Vermilian's, which writes the
      cask file whole rather than patching it.

      The tap already exists and is reusable —
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

- [ ] **[decision] Is a real Apple Developer ID worth it?** *Still open.* The workflow currently
      ships **unsigned**, matching Vermilian: it sets `CSC_IDENTITY_AUTO_DISCOVERY: false`, without
      which electron-builder hunts for a signing identity, fails to find one, and fails the job. The
      release notes it generates tell the user to run
      `xattr -dr com.apple.quarantine /Applications/Marky.app`.

      Only a real Developer ID buys actual code signing and notarization: no Gatekeeper warning, no
      `xattr` workaround, no "app is damaged" dialog. Costs ~$99/year and adds `CSC_LINK` /
      `CSC_KEY_PASSWORD` / notarization secrets to the workflow. Buying one later is an edit to the
      `macos-14` matrix leg, not a rewrite — nothing here forecloses it.

- [ ] **Publish a `checksums.txt` covering every release asset.** Roughly ten lines, copied from
      Vermilian's `channels` job: `gh release download`, `sha256sum *`, `gh release upload
      --clobber`. Deferred to another day, per Kevin 2026-08-01.

- [ ] **Run the test suite in the workflow before building.** `personal` currently has **no CI at
      all** — upstream's `test.yml` triggers only on `main` and on PRs to `main`, and the Husky
      hooks are deliberately bypassed on `personal`, so nothing is checked automatically on this
      branch. Gate the release on the 154 unit tests at minimum. E2E needs
      `npx electron-vite build` first (see `RUNBOOK.md` Step 5). Deferred to another day, per Kevin
      2026-08-01.

- [x] **Linux arm64 AppImage prerequisites.** Done 2026-08-02 — both Linux matrix legs install
      `libfuse2t64` with a fallback to `libfuse2` before packaging, and arm64 builds natively on
      `ubuntu-24.04-arm` rather than cross-compiling.

## CI for the `personal` branch

- [x] **Add continuous CI on `personal`.** Done 2026-08-01 — `.github/workflows/personal-ci.yml`,
      three jobs: `static` (lint + typecheck), `unit-tests`, `e2e-tests`. Triggers on push and PR to
      `personal`, plus `workflow_dispatch`. `actions/checkout` v6.0.2 and `actions/setup-node` v6.4.0
      are SHA-pinned from the directive table; Node 24 matches `mise.toml`. A `concurrency` group
      with `cancel-in-progress` keeps a force-push from leaving superseded runs going. All four
      checks were confirmed green locally first: lint 0 errors / 2 known warnings, typecheck clean,
      154 unit tests, 127 e2e. Confirmed green in CI too — run `30725481929` on `259baeb`, all three
      jobs success, about 2m40s wall clock. The original analysis follows, kept because it explains
      the design:

      The branch previously had **no automated verification of
      any kind**, and it is the branch actually being used and built. Two independent gaps stacked up:

      1. Upstream's `.github/workflows/test.yml` triggers only on `push`/`pull_request` to `main`,
         so nothing runs when `personal` is pushed.
      2. `.husky/pre-commit` and `.husky/commit-msg` both exit 0 immediately on `personal` (see
         `CLAUDE.md` → Git hooks), so lint, typecheck and commitlint are all skipped locally too.

      Net effect: every check on `personal` was one a human remembered to run by hand.

      **Write a new `.github/workflows/personal-ci.yml` rather than editing `test.yml`.** `test.yml`
      is an upstream file that travels back in pull requests; adding `personal` to its branch list
      would create a permanent conflict on every future sync. A separate personal-only file has zero
      conflict surface — the same reasoning already applied to the release workflow above.

      What it should run — note the first two are **not** covered by upstream's `test.yml` at all,
      they only ever ran in the bypassed Husky hook:

      - `npm run lint` — expect 0 errors, 2 known upstream warnings in `i18n-context.tsx`
      - `npm run typecheck`
      - `npm test` — 154 unit tests
      - e2e — copy the working recipe from `test.yml`'s `e2e-tests` job: `npm run build`, then
        `npx playwright install-deps`, then
        `xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" npx playwright test`.
        The `npm run build` step is what keeps `out/` fresh, so the stale-`out/` trap documented in
        `RUNBOOK.md` Step 5 does not apply in CI — do not drop it.

      SHA-pin every action per
      `~/ai/directives/when-generating-code-or-updating-code-in-an-outside-repo.md`.

      The interim workaround this item used to recommend — running upstream's `test.yml` manually
      against `personal` via `workflow_dispatch` — is no longer needed, though it still works.

## Features

- [ ] **Open a file by full path.** Typing a full path (e.g. `/home/kinscoe/notes/draft.md`) into the
      file browser should open that file directly instead of merely navigating the chooser to its
      parent directory. Marky needs a direct "open this full path" command — for example an
      *Open Path…* menu item / keyboard shortcut that prompts for a path and opens it, and/or
      path-aware handling in the existing open dialog (`src/main/ipc/document.ts`,
      `dialog.showOpenDialog`).
