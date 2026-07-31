# TODO

Human-owned task list for this fork. See `CLAUDE.md` for branch strategy.

- [ ] **Open a file by full path.** Typing a full path (e.g. `/home/kinscoe/notes/draft.md`) into the file browser should open that file directly instead of merely navigating the chooser to its parent directory. Marky needs a direct "open this full path" command — for example an *Open Path…* menu item / keyboard shortcut that prompts for a path and opens it, and/or path-aware handling in the existing open dialog (`src/main/ipc/document.ts`, `dialog.showOpenDialog`).
