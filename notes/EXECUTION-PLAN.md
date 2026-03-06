# HeroPlanner v2 — Execution Plan

This plan orchestrates the TODO.md tasks across 4 phases. Each phase is a separate Claude Code session. Within each phase, independent tasks run in parallel via worktrees + background tasks.

## How to Run Each Phase

Start a Claude Code session and give it this prompt pattern:

```
Execute Phase N from notes/EXECUTION-PLAN.md.

For parallel tasks: create a worktree for each group, spawn background tasks,
wait for all to complete, then merge each branch back to master and clean up.

For sequential tasks: work through them in order on master, committing after each.

After each task, run `npx tsc -b --noEmit` and `cd src-tauri && cargo check`
to verify the build is clean before moving on.
```

---

## Phase 1 — Quick Wins (parallel, no shared files)

All 4 groups touch completely different files. Run all simultaneously.

### Group A — Toast fixes (branch: `fix/toasts`)
**Tasks**: 1.1, 1.2
**Files touched**: `src/stores/heroStore.ts` (line ~770 only), `src/App.tsx` (Toaster component)
**Acceptance**: No duplicate toast on build load. Toasts scale with UI zoom.

### Group B — Decorative divider (branch: `ui/header-divider`)
**Tasks**: 3.1
**Files touched**: `src/App.tsx` (between Header and panels)
**Acceptance**: A thin gradient bar (2-3px, transparent→blue/gold→transparent) appears below the header.

### Group C — Right panel placeholder tabs (branch: `feat/right-panel-tabs`)
**Tasks**: 7.1, 7.2, 7.3
**Files touched**: `src/components/planner/RightPanel.tsx`, possibly new components, backend queries
**Notes**: 7.1 (Inherents) requires finding inherent powerset data in the DB. 7.2/7.3 may just be improved placeholders with data stubs if full implementation is too large for this phase.
**Acceptance**: Inherents tab shows AT inherent powers. Incarnates/Accolades tabs at minimum have better placeholder UI with data model outlined.

### Group D — Donate button + Clear build (branch: `feat/header-controls`)
**Tasks**: 8.1, 5.1
**Files touched**: `src/components/planner/Header.tsx`, `src/stores/heroStore.ts` (new `clearBuild` action)
**Notes**: Donate URL TBD — use a placeholder URL that's easy to find-and-replace. For clear build, add the store action + header button. No confirmation dialog yet (that's 5.2 in Phase 2).
**Acceptance**: Heart icon in header opens external URL. Trash/clear icon resets the build.

### Merge order
Merge A → B → C → D to master. A and D both touch heroStore.ts so merge D last — the changes are in completely different sections (line 770 for A, new action for D) so conflicts are unlikely but resolve manually if needed.

---

## Phase 2 — Sequential Core (on master, commit after each)

These tasks share files heavily (calc.rs, models.rs, models.ts, heroStore.ts). Must be sequential.

### 2.3 → Enhancement levels
**Files**: `src/types/models.ts`, `src-tauri/src/models.rs`, `src/stores/heroStore.ts`, `src/components/planner/EnhancementPicker.tsx`, `src/components/planner/EnhancementSlot.tsx`
**Acceptance**: Each slotted enhancement has a level. Attuned toggle available. Level persisted in save files.

### 2.4 → Enhancements modify power stats
**Files**: `src-tauri/src/commands/calc.rs`, `src/stores/heroStore.ts`, `src/components/planner/PowerHoverCard.tsx`
**Depends on**: 2.3 (needs enhancement levels to calculate strength)
**Acceptance**: Slotting a Damage IO visibly increases damage in PowerHoverCard and Total Stats.

### 2.5 → Enhancement Diversification
**Files**: `src-tauri/src/commands/calc.rs`
**Depends on**: 2.4 (needs the enhancement-to-power pipeline)
**Acceptance**: Stacking 3+ Damage enhancements shows diminishing returns. ED-adjusted values visible in hover card.

### 4.3 → Stat value caps
**Files**: `src-tauri/src/commands/calc.rs`, `src/types/models.ts`, `src/components/planner/TotalStatsTab.tsx`
**Acceptance**: Stats are clamped to AT caps. Cap values shown in UI.

### 4.4 → Run Speed attribution
**Files**: `src-tauri/src/commands/calc.rs`, `src-tauri/src/commands/utils.rs`
**Acceptance**: Run Speed stat is expandable and shows contributing powers.

### 5.2 → Confirmation dialogs
**Files**: `src/stores/heroStore.ts`, new `ConfirmDialog` component, `src/components/planner/Header.tsx`
**Acceptance**: Changing AT/powerset with existing build shows "are you sure" dialog. Loading with unsaved changes prompts.

---

## Phase 3 — UI Polish (parallel, builds on Phase 2)

After Phase 2 establishes the data pipeline, these are purely frontend/visual tasks on different components.

### Group E — Total Stats UI (branch: `ui/total-stats-polish`)
**Tasks**: 4.1, 4.2, 4.5
**Files touched**: `src/components/planner/TotalStatsTab.tsx`, `src/styles/globals.css`
**Acceptance**: Vital bars have shimmer animation. Defense bars show 45% soft cap marker. Stat categories have icons. Misc stats sorted properly.

### Group F — Enhancement UX (branch: `ui/enhancement-ux`)
**Tasks**: 2.1, 2.2
**Files touched**: `src/components/planner/PowerSlotCard.tsx`, `src/components/planner/EnhancementSlot.tsx`
**Acceptance**: Drag right on slot bar adds slots, drag left removes. Enhancement icons slightly larger.

### Group G — Left panel + Grid (branch: `ui/left-panel-redesign`)
**Tasks**: 3.2, 3.3
**Files touched**: `src/components/planner/LeftPanel.tsx`, `src/components/planner/PowerSetSelector.tsx`, `src/components/planner/HeroInfo.tsx`, `src/components/planner/RightPanel.tsx`
**Acceptance**: Left panel has CoH in-game aesthetic. Power card grid responds to panel width.

### Merge order
E → F → G (no file overlap between groups).

---

## Phase 4 — Big Features (sequential, each is substantial)

### 6.1 → Proc chance calculator
**Files**: New Rust command, new frontend component/panel
**Acceptance**: PPM-based proc chance shown when a proc enhancement is slotted.

### 6.2 → DPS calculator
**Files**: New Rust command (optimization logic), new frontend tab/panel
**Acceptance**: Select powers for attack chain, see DPS output with enhancement and proc factors.

### 6.4 → Build branching and comparison
**Files**: `src/stores/heroStore.ts` (major), new components
**Acceptance**: Fork a build, edit enhancements independently, compare stats side-by-side.

### 6.3 → AI build advisor
**Files**: New components, Claude API integration
**Acceptance**: Chat panel that analyzes the current build and suggests improvements.
**Note**: This is the most open-ended feature. Consider a spike/prototype first.

---

## Pre-flight Checklist (before starting any phase)

1. `git status` — ensure clean working tree
2. `npx tsc -b --noEmit` — TypeScript compiles clean
3. `cd src-tauri && cargo check` — Rust compiles clean
4. Read `notes/TODO.md` for detailed task specs
5. Read `CLAUDE.md` for project conventions

## Post-phase Checklist

1. All branches merged and worktrees cleaned up
2. `npx tsc -b --noEmit` + `cargo check` pass
3. `npm run dev` — manual smoke test
4. Update TODO.md — mark completed tasks
5. Commit with descriptive message summarizing the phase
