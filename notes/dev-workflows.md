# Dev Workflows

## 1. Frontend-Only (Browser) — for UI work

Runs Vite dev server with mock data. No Tauri/Rust/DB needed.

```bash
npm run dev:frontend
```

Open `http://localhost:5173` in Chrome/Edge on Windows. Hot reload works.

**What works:** All UI components, archetype selection, powerset dropdowns, power toggling, slot management, settings/zoom (no-op), styling, layout.

**What doesn't work:** Real game data (uses hardcoded mock with ~10 archetypes, 3 primary sets, 3 secondary sets, 6 power pools), power detail queries, boost sets, stat calculation.

**Mock data location:** `src/lib/mock-data.ts` — edit to add more test data as needed.

## 2. Full Tauri on WSL2 — quick backend testing

Runs the full app via WebKitGTK on WSL2. Slow rendering but real data.

```bash
make dev
```

**Known issues:**
- No GPU acceleration — hover/transitions are sluggish
- HiDPI scaling quirks (zoom setting in app helps)
- Use this only for testing Rust backend changes, not UI polish

## 3. Full Tauri on Windows — production-like testing

Native Windows app with WebView2. Fast, GPU-accelerated, proper DPI.

### First-time setup

1. Install Visual Studio Build Tools (C++ workload)
2. Install Rust: `winget install Rustlang.Rustup`
3. Install Node: `winget install Schniz.fnm && fnm install 20 && fnm use 20`

### Sync and run

```bash
# From WSL2:
make sync

# From Windows PowerShell:
cd C:\dev\heroplanner-v2
npm install          # first time only
npm run dev
```

First time only — copy the database:
```powershell
copy \\wsl$\Ubuntu\home\charl\dev\heroplanner-v2\src-tauri\heroplanner.db C:\dev\heroplanner-v2\src-tauri\
```

### When to sync

Run `make sync` whenever you want to test Rust/backend changes on Windows. It uses rsync (excludes node_modules, target, .git) so incremental syncs are fast.

## Recommended day-to-day flow

1. **UI work:** `npm run dev:frontend` → browser on Windows (fast, instant)
2. **Backend changes:** Edit Rust → `make sync` → run `npm run dev` from Windows PowerShell
3. **Quick sanity check:** `make dev` on WSL2 (sluggish but convenient)
