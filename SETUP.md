# peak

VS Code extension. MIT.

## First-time setup

Prerequisites: Nix (flakes), [direnv](https://direnv.net/), Make.

From repo root:

```bash
direnv allow          # loads Bun + Node from flake.nix
bunx yo code          # scaffold extension (interactive)
make install
make compile
```

**NixOS gotchas:** `nodePackages` was removed from nixpkgs (2026). Do not use `npm create yo` — `create-yo` needs npm's internal `libnpx`, which Nix npm lacks. Use `bunx yo code` instead.

On NixOS or without direnv: `nix develop` instead of `direnv allow`.

Dev tooling: Nix flakes + direnv + Make + Bun for `yo code` scaffold. See `flake.nix` and `Makefile`.

## Dev commands

| Command | What |
|---------|------|
| `make help` | List repo-root commands |
| `make install` | `npm install` |
| `make compile` | Build extension to `dist/` |
| `make dev` | Launch Extension Development Host with Peak loaded |
| `make watch` | Watch and recompile TypeScript |
| `make test` | Unit tests (see NixOS note below) |
| `make lint` | Lint / typecheck |
| `make package` | Build `.vsix` |

## Developing in Cursor

Peak is developed in one Cursor window and tested in a **second** window (the Extension Development Host). Commands such as **Peak understand** exist only in the dev host window, not in the window where you edit the repo.

### Launch the dev host

From repo root, either:

```bash
make dev
```

or open this folder in Cursor and press **F5** (Run Extension).

Both run [`scripts/dev-host.js`](scripts/dev-host.js), which starts a new Cursor process with:

- `--extensionDevelopmentPath` pointing at this repo (loads Peak from source)
- `--user-data-dir=.vscode-test/dev-profile` (isolated profile so Peak actually loads)

F5 also runs `npm run compile` first via the preLaunchTask.

### Why not the built-in `extensionHost` debugger?

On Cursor, if another instance is already running, a plain `--extensionDevelopmentPath` launch is forwarded to that instance and the flag is dropped — Peak never appears in the command palette.

The isolated profile under `.vscode-test/dev-profile` avoids that. The standard VS Code/Cursor `extensionHost` debug configuration does not pass this flag reliably on Cursor, so this repo uses the launcher script instead. See [`.vscode/launch.json`](.vscode/launch.json).

Override the editor binary if needed:

```bash
export CURSOR_PATH=/path/to/cursor   # default: cursor on PATH
# or
export VSCODE_EXECUTABLE_PATH=/path/to/code
make dev
```

### Test Peak understand

In the **new** dev host window:

1. **File → Open Folder** — open any project with TypeScript (this repo works).
2. Open a `.ts` file and place the cursor inside a function or symbol.
3. Run **Peak understand** via:
   - **Right-click** in the editor → **Peak understand**, or
   - **Command Palette** (`Ctrl+Shift+P`) → **Peak understand**
4. A split-down panel should open with **Call Hierarchy** and **Dependencies** tabs and a **Copy diagram code** button.

After code changes: `make compile` (or F5, which compiles first), then **Developer: Reload Window** in the dev host window.

### Verify Peak is loaded

In the **dev host window** (not your main editor):

| Check | Expected |
|-------|----------|
| Extensions → filter `@development` | **Peak** listed |
| `Ctrl+Shift+P` → **Developer: Show Running Extensions** | Peak under Development Extensions |
| Output → **Extensions** | `Loading development extension at …/peak` |

### Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| No **Peak understand** command | Using main Cursor window instead of dev host |
| Command missing in dev host too | Compile failed, or Peak not under `@development` |
| Empty diagrams / warnings | Language server lacks call hierarchy or definition providers for that file |
| `make test` fails on NixOS | `@vscode/test-electron` downloads a generic Linux VS Code binary that NixOS cannot run; use `make dev` for manual testing, or set `VSCODE_EXECUTABLE_PATH` to a nixpkgs `vscode` |

## NixOS notes

- **Extension dev:** use `make dev` or F5 as above.
- **Unit tests:** `make test` may fail with `Cannot run dynamically linked executable` for the downloaded VS Code test binary. Run domain tests with `npm run compile-tests && npx mocha out/test/mermaidDiagrams.test.js --ui tdd`, or point `VSCODE_EXECUTABLE_PATH` at nixpkgs `vscode` before `make test`.
