# TODO

Human-owned task list for this fork. See `CLAUDE.md` for branch strategy. Most of the items
below come out of the 2026-07-31 upstream sync — `PLAN.md` carries the full detail. The untracked
`CHECKPOINT.md` that tracked that work through Session 6 (2026-08-02) was deleted on 2026-08-09;
every step it recorded is closed except the theme-palette decision, which lives here instead.

Prefixes: **[broken]** a defect to fix, **[decision]** something only Kevin can rule on,
**[hanging]** work started and not finished.

## Upstream sync — started 2026-07-31, not finished

- [x] **Restart Marky and look at the synced build.** Done 2026-08-01 — rebuilt via `bash ./build.sh`
      and reinstalled to `~/.local/bin/Marky.AppImage` (verified byte-identical to
      `dist/Marky-0.1.1.AppImage`), then launched and confirmed running by Kevin.

      **Superseded 2026-08-02:** the FLDW now runs the *released* build rather than a local one.
      `Marky-0.1.2.AppImage` was downloaded from `personal-v0.1.2` and installed to the same path,
      byte-identical to the published asset. The desktop entry's `Exec=` is unchanged, so the KDE
      launcher needed no edit and the eight installed icons were already correct.

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
      in sync. Ten old commit SHAs are no longer reachable from `origin/personal`. They were held by
      the tag `personal-pre-sync-2026-07-31` (`37b1707`), which was verified to contain the old
      remote tip before the push — **that tag was deleted on 2026-08-02** (see below), so there is no
      longer a route back. **The history was rewritten** — any other clone of this repo must
      `git reset --hard origin/personal` rather than pull.

- [x] **Document the `upstream` remote and the sync procedure in `CLAUDE.md`.** Done 2026-08-01 —
      added a *Remotes* table (including why the `upstream` push URL is deliberately broken) and a
      *Syncing with upstream* procedure covering the safety tag, the PR-branch-before-`personal`
      ordering and why, and the cherry-pick workaround for the unavailable interactive rebase.

- [x] **Record the stale-`out/` e2e gotcha in `RUNBOOK.md`.** Done 2026-08-01 — added as a warned
      Step 5 (`npx electron-vite build` is mandatory before `npm run test:e2e`), in the Verification
      block, and as a Troubleshooting row. Also added Step 4 for `build.sh`, rollback-from-tag
      instructions, and rows for "Text file busy" and the `desktopName` warning.

- [x] **[hanging] Delete the `personal-pre-sync-2026-07-31` tag.** Done 2026-08-02, on Kevin's
      instruction. The condition was met: `personal` is published, CI is green on it, and
      `personal-v0.1.2` was built, published and verified from it.

      The tag was never pushed — `personal-v0.1.2` is the only tag on `origin` — and it was the only
      ref containing `2b40fd9` and `400e973`, so both are now unreachable and will be collected.
      Their diffs were saved first to `~/tmp/marky-dropped-commits-2026-08-02/` purely as insurance.
      **`~/tmp` is a scratchpad and may be cleaned** — move them if they should be kept, though per
      the palette item below the CSS patch must not be reinstated in any case.

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

**First release cut 2026-08-02: [`personal-v0.1.2`](https://github.com/kevinpinscoe/marky/releases/tag/personal-v0.1.2).**
Run `30755680827`, all five jobs green, about 2m10s end to end. Three assets published:

| Asset | Size | Verified |
|---|---|---|
| `Marky-0.1.2.AppImage` | 163.2 MB | ELF `e_machine` = x86-64 |
| `Marky-0.1.2-arm64.AppImage` | 163.6 MB | ELF `e_machine` = AArch64 |
| `Marky-0.1.2-arm64.dmg` | 156.6 MB | unsigned, as designed |

Both design bets held up under a real run. The `personal-` prefix worked: **only** `Personal Release`
fired on the tag — `linux-build.yml`, `windows-build.yml` and `flatpak.yml` all stayed put. And the
version-align step worked: `package.json` still says `0.1.1`, yet every asset is named `0.1.2`.

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

- [x] **macOS install via Homebrew Cask.** Added 2026-08-05. `HOMEBREW_TAP_TOKEN` was already set
      on `kevinpinscoe/marky` (confirmed via `gh secret list`, set 2026-08-05) so the step was wired
      in directly rather than deferred.

      Three new steps at the end of the `publish` job in `personal-release.yml`, mirroring
      Vermilian's "Update Homebrew tap (Cask)" job: download the `.dmg` from the just-published
      release, compute its version (stripped of the `personal-v` prefix) and SHA-256, then clone
      `kevinpinscoe/homebrew-tap` and write `Casks/marky.rb` whole (not patched) before committing
      and pushing.

      One deliberate divergence from Vermilian's cask: the `zap trash` and `postflight` paths use
      `com.marky.app` (this repo's actual `build.appId` in `package.json`), not the
      `com.electron.<name>` pattern Vermilian's cask uses — that pattern is electron-forge's
      *default* bundle id derived from `package.json`'s `name` field, which only applies because
      Vermilian never overrides it. Marky is built with electron-builder and sets `appId` explicitly,
      so its real bundle id is `com.marky.app`; copying Vermilian's pattern verbatim would have
      pointed the cask's uninstall/zap step at a plist and saved-state path the app never creates.

      **Verified 2026-08-05 with `personal-v0.1.3`** — first release to exercise the Cask step end
      to end. All three jobs in `publish` (promote, download dmg, compute sha256, update tap)
      succeeded on the first try; `Casks/marky.rb` landed in `kevinpinscoe/homebrew-tap` with
      version `0.1.3`, the correct arm64 DMG URL, and a matching SHA-256. End state matches
      Vermilian:
      ```bash
      brew tap kevinpinscoe/tap
      brew install --cask kevinpinscoe/tap/marky
      brew upgrade --cask kevinpinscoe/tap/marky
      ```

      > ⚠️ **`marky` alone is ambiguous — always fully-qualify.** `grvydev/tap/marky` is an
      > unrelated cask that also happens to be named `marky`. Discovered 2026-08-07 when
      > `brew install --cask marky` failed with "Cask marky exists in multiple taps." Use
      > `kevinpinscoe/tap/marky` for install/upgrade/list, not the bare name.

      > ⚠️ **`personal-v0.1.3`, not `0.1.2`.** A separate, independently-written mac-build +
      > Homebrew Cask implementation (`macos-build.yml`, PR #1, merged 2026-08-04) had landed
      > **directly on `main`** — a branch-strategy violation, since fork-only CI belongs on
      > `personal` and `main` is supposed to carry no commits of its own. A bare `v0.1.2` tag on
      > `main` (2026-08-05) then fired that workflow alongside every upstream per-tag workflow
      > (`linux-build.yml`, `windows-build.yml`, `flatpak.yml`) and got marked **Latest** — and its
      > cask-publish step failed outright, hitting the exact CLI-arch bug already documented above
      > (`--mac dmg` with no arch flags built only the runner's host arch, so the script's
      > `INTEL_DMG` glob came up empty). Recovery: `main` was hard-reset to `upstream/main` and
      > force-pushed (a plain `git revert` would have left two extra commits on `main`, still
      > diverging it from `upstream/main` and breaking the `merge --ff-only` sync step below); the
      > `v0.1.2` tag and its GitHub release were deleted; `build/icon.icns` — a genuine, unrelated
      > bugfix bundled into that same PR (`package.json`'s `mac.icon` had pointed at this path since
      > the electron-builder setup was added, but the file never existed) — was salvaged onto
      > `personal` before the reset erased it. `0.1.2` was already used by the (still valid)
      > `personal-v0.1.2` release, so the recovery release was cut as `personal-v0.1.3` instead of
      > redoing `0.1.2`.

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

- [ ] **Run the test suite in the release workflow before building.** Gate the release on the 154
      unit tests at minimum. E2E needs `npx electron-vite build` first (see `RUNBOOK.md` Step 5).
      Deferred to another day, per Kevin 2026-08-01.

      *Scope narrowed 2026-08-01:* this item originally argued that `personal` had **no CI at all**.
      That gap is closed — `personal-ci.yml` (see the CI section below) now runs lint, typecheck,
      unit and e2e on every push to `personal`. What remains is narrower: `personal-release.yml`
      triggers on a `personal-v*` tag and builds without running any tests itself, so a tag pushed
      at a red commit still ships. The fix is a test job the `build` matrix depends on.

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
