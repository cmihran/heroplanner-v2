# HeroPlanner v2 — TODO

## 1. Toast System Fixes

### ~~1.1 Duplicate "enhancement data could not be resolved" toast~~ ✅
- **File**: `src/stores/heroStore.ts:770`
- **Problem**: On build load, the warning toast "Some enhancement data could not be resolved" fires twice. The `resolve_boost_keys` call in the load flow likely triggers the catch block multiple times, or the load function runs twice (e.g. initial mount + auto-load).
- **Fix**: Investigate the load flow in `loadBuildFromFile` — check if the resolve step runs in two passes (once for the initial load, once for the IO fallback icon pass at lines 740-766). Deduplicate so only one toast fires if there are unresolved keys.

### ~~1.2 Toast not scaling with UI zoom~~ ✅
- **File**: `src/App.tsx:33` — `<Toaster position="bottom-right" theme="dark" richColors />`
- **Problem**: The app uses root `font-size` scaling (via `heroplanner-zoom` localStorage key) for zoom. The Sonner `<Toaster>` component renders in a portal and may not inherit the root font-size, so toasts appear at the default size regardless of zoom level.
- **Fix**: Check if Sonner's toaster portal inherits root `font-size`. If not, pass a custom `style` or `className` prop to the `<Toaster>` component that applies the current zoom factor. Alternatively, wrap the toast container in a div that inherits the root font-size.

---

## 2. Enhancement System

### 2.1 Drag-to-add/remove enhancement slots
- **Files**: `src/components/planner/PowerSlotCard.tsx` (enhancement slot row, lines 116-141), `src/stores/heroStore.ts` (`addSlot`/`removeSlot` actions)
- **Behavior**: When the user clicks and drags rightward along the enhancement slot bar on a PowerSlotCard, automatically add enhancement slots one-by-one as the mouse moves right. Dragging leftward removes slots. This is a mouse gesture shortcut alternative to clicking the ghost "+" button.
- **Implementation notes**:
  - Add `onMouseDown` on the enhancement slot container div (line 117)
  - Track horizontal mouse movement in a `onMouseMove` handler (attached to `document` on mousedown, removed on mouseup)
  - Calculate slot thresholds based on slot width (`2.25rem` + `0.25rem` gap = ~2.5rem per slot)
  - On rightward drag past a threshold: call `addSlot(power.full_name)` if `numSlots < power.max_boosts && canAddMore()`
  - On leftward drag past a threshold: call `removeSlotAt(power.full_name, numSlots - 1)` if `numSlots > 1`
  - Provide visual feedback (highlight the zone where the next slot would appear)
  - Must not conflict with the existing click-to-open EnhancementPicker popover on individual slots

### 2.2 Slightly larger enhancement icons
- **Files**: `src/components/planner/EnhancementSlot.tsx`, `src/components/planner/PowerSlotCard.tsx`
- **Current size**: Enhancement slots are `w-[2.25rem] h-[2.25rem]` (lines 27, 37, 39 in EnhancementSlot.tsx)
- **Change**: Increase to approximately `w-[2.5rem] h-[2.5rem]` or `w-[2.75rem] h-[2.75rem]`. Adjust the ghost add button, remove button positioning, and slot container padding/margins to match.
- **Note**: Use `rem` units (not `px`) so sizes scale with the UI zoom.

### 2.3 Enhancement levels
- **Scope**: Each slotted enhancement should have an associated level (e.g. level 50 IO, level 25 IO). Attuned enhancements auto-scale to character level.
- **Data model changes**:
  - Add `level: number | null` and `isAttuned: boolean` to the `SlottedBoost` type in `src/types/models.ts`
  - Add corresponding fields to the Rust `SlottedBoost` struct in `src-tauri/src/models.rs`
  - Update the save/load format in `HeroBuildFile` to persist enhancement levels
- **UI changes**:
  - Show the enhancement level as a small badge/number overlay on the enhancement slot icon (e.g. bottom-right corner, tiny text)
  - In the EnhancementPicker popover (`src/components/planner/EnhancementPicker.tsx`), add a level selector (number input or slider, range determined by the boost set's `min_level`/`max_level`)
  - Add an "Attuned" toggle in the picker. When attuned, the level badge shows "A" or a special indicator, and the enhancement auto-scales to the build's level for calculation purposes
- **Backend**: The boost set data already has `min_level`/`max_level` in the `boost_sets` table. Enhancement level affects the magnitude of the boost (higher level = stronger).

### 2.4 Enhancements modify power stats (full calculation)
- **Scope**: Slotted enhancements should affect all calculated power stats (accuracy, damage, recharge, endurance cost, etc.). Results should appear in both PowerHoverCard tooltips and Total Stats tab.
- **Backend changes** (`src-tauri/src/commands/calc.rs`):
  - `calculate_power_effects` needs a new parameter: the list of slotted enhancements for that power (boost keys + levels)
  - For each slotted enhancement, look up its effect templates (already in DB from migration — `powers/boosts/` data). Each template has `table`, `scale`, `attribs` specifying what the enhancement boosts.
  - Apply the enhancement formula: `boosted_value = base_value * (1 + sum_of_enhancement_strengths)` for each matching attrib
  - Enhancement strength depends on level: look up the enhancement's AT table at the enhancement's level (or character level if attuned)
  - `calculate_total_stats` should incorporate enhancement-modified power values instead of raw base values
- **Frontend changes**:
  - `PowerHoverCard` should show enhanced values (with visual distinction from base values, e.g. green text for enhanced portion)
  - Total Stats should reflect enhancement-boosted power effects
- **Dependencies**: This task depends on 2.3 (enhancement levels) since the enhancement's contribution depends on its level.

### 2.5 Enhancement Diversification (ED)
- **Scope**: Implement the diminishing returns system for enhancement values. In CoH, enhancements of the same type in the same power have diminishing returns above certain thresholds.
- **Formula** (3-zone piecewise):
  - 0% to ~40% (zone 1): 100% effectiveness (1:1 return)
  - ~40% to ~70% (zone 2): diminished effectiveness (~60% return)
  - Above ~70% (zone 3): severely diminished (~10% return)
- **Backend**: Apply ED after summing all enhancement contributions of the same type (e.g. all Damage enhancements in one power). The result is the effective enhancement strength used in `boosted_value = base_value * (1 + effective_strength)`.
- **Frontend**: Show both raw and ED-adjusted values in the PowerHoverCard. Optionally highlight when enhancements are past the ED soft cap (visual warning that adding more of the same type has diminishing returns).
- **Dependencies**: Depends on 2.4 (enhancements modify powers).
- **Reference**: Plain IO boost data is in the DB under `powers/boosts/` entries. Effect templates have `table` + `scale` + `attribs` fields needed for ED calculations.

---

## 3. General UI

### ~~3.1 Decorative divider below header~~ ✅
- **File**: `src/App.tsx` or `src/components/planner/Header.tsx`
- **Description**: Add a horizontal gradient bar beneath the "Hero Planner" header, similar to the decorative line in the CoH in-game UI. A thin gradient line (e.g. 2-3px) transitioning from transparent → blue/gold → transparent, creating a visual separation between the header and the main panel area.
- **Implementation**: A simple `<div>` with a CSS gradient background, placed between the `<Header />` and the `<ResizablePanelGroup>` in App.tsx.

### 3.2 Left panel redesign — CoH in-game style
- **Files**: `src/components/planner/LeftPanel.tsx`, `src/components/planner/PowerSetSelector.tsx`, `src/components/planner/HeroInfo.tsx`
- **Direction**: Redesign the left panel to match the City of Heroes in-game UI aesthetic:
  - Dark panel backgrounds with subtle beveled/raised edges
  - Blue/gold accent colors matching the CoH palette (already have `coh-gradient1-4` theme colors)
  - Powerset selector dropdowns styled like in-game menus (darker backgrounds, glowing borders on hover)
  - Power list items with the same pill/capsule styling already used on PowerSlotCard
  - Tab headers styled with the in-game tab aesthetic
  - Consider adding powerset icons next to the powerset names in the dropdown
- **Note**: The PowerSlotCard has already been redesigned to the in-game pill shape. The left panel should follow the same design language.

### 3.3 Responsive power card grid
- **File**: `src/components/planner/RightPanel.tsx:27`
- **Current**: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
- **Problem**: At narrow window widths, the cards may be too wide or too narrow. The grid should respond to the actual panel width (which is resizable), not just the viewport width.
- **Fix**: Use container queries (Tailwind v4 supports `@container`) or calculate columns based on the panel's actual width. Ensure that at very narrow widths (e.g. panel dragged small), it falls back to a single column with appropriately sized cards.

---

## 4. Total Stats Improvements

### 4.1 Vital bar animations
- **File**: `src/components/planner/TotalStatsTab.tsx` (VitalBars component, lines 95-241)
- **Description**: Add subtle animations to the HP and Endurance bars to make them feel alive, similar to in-game vitals:
  - A slow shimmer/pulse effect on the bar fill (already has a basic `animate-pulse` on a transparent overlay at line 121, but it could be more pronounced)
  - Smooth transition animation when HP/End values change (e.g. when toggling powers on/off)
  - Optional: a subtle "heartbeat" pulse on the HP bar value text
- **Implementation**: CSS animations via Tailwind's `@keyframes` in `globals.css` or inline styles. Keep it subtle — the bars should feel alive but not distracting.

### 4.2 Defense soft cap indicator
- **Description**: The defense soft cap in CoH is 45% (floor hit chance of 5%). Defense bars should visually indicate this cap.
- **File**: `src/components/planner/TotalStatsTab.tsx` (StatRow component, line 37: `barPct` calculation)
- **Current**: The bar fills based on `totalValue * 100`, capped at 100% visually.
- **Change**:
  - Show the actual calculated defense percentage (don't cap the text value)
  - Add a visual marker on the bar at 45% (a thin vertical line or color transition)
  - If defense exceeds 45%, the bar portion above the cap could use a different color/opacity to indicate "over soft cap"
  - The bar should scale so that 45% = ~75% of the bar width (so values above cap are still visible but clearly past the line)

### 4.3 Value caps for resistance, max HP, etc.
- **Description**: Apply and display AT-specific caps for stats:
  - **Resistance cap**: varies by AT (Tankers 90%, Brutes 90%, Scrappers 75%, Blasters 75%, etc.) — from `attrib_str_max` or `attrib_res_max` in archetype raw_json
  - **Max HP cap**: each AT has a maximum HP cap
  - **Recharge cap**: typically 400% (500% total with base)
  - **Damage cap**: varies by AT (from `attrib_str_max.damage` in archetype data)
- **Backend**: `calculate_total_stats` in `calc.rs` should read the AT's cap values from `raw_json` and clamp final stats. Return the cap values alongside the stats so the frontend can display them.
- **Frontend**: Show cap values in the UI (e.g. "75% / 75% cap" for resistance). Use the cap as the bar's 100% reference point.

### 4.4 Run Speed attribution missing
- **File**: `src-tauri/src/commands/utils.rs:133` — `("RunningSpeed", _) => ("Movement", "Run Speed")`
- **Problem**: Run Speed shows up as a stat but doesn't have source attribution (can't expand to see which powers contribute).
- **Investigation**: The categorization exists, so the issue might be that movement powers use a different attrib name, target type, or aspect that gets filtered out. Check if movement effects have `target != "Self"` (line 249 in calc.rs filters to Self-only). Sprint, Super Speed, etc. might target differently. Also check if the attrib name in the data matches `RunningSpeed` exactly.

### 4.5 Sort out Misc stats
- **Description**: The Misc category is a catch-all for uncategorized stats. Clean it up:
  - **Other stats**: Review what falls into `("Misc", "Other")` (the default case at utils.rs:166). Add proper categorization for common attribs that currently land here.
  - **Repel stats**: Currently mapped to `("Misc", "Repel")`. Consider whether this belongs under a different category or needs a better label.
  - **Teleport**: Mapped to `("Misc", "Teleport")`. Could go under Movement.
  - **Icons**: Add simple colored SVG icons or Unicode symbols next to stat category headers and individual defense/resistance type labels (e.g. a flame icon for Fire, a snowflake for Cold, a fist for Smashing, a lightning bolt for Energy, etc.)
- **Implementation for icons**: Create a small mapping of stat labels to SVG icons or Unicode characters in the frontend. Render them inline next to stat labels in the TotalStatsTab `StatRow` and `CategorySection` components.

---

## 5. Save/Load Functions

### ~~5.1 Clear current build button~~ ✅
- **File**: `src/components/planner/Header.tsx` (add button near existing Save/Load buttons)
- **Behavior**: Resets the current build to a blank state — clears all selected powers, enhancement slots, hero name, and optionally archetype/powerset selections.
- **Store action**: Add a `clearBuild()` action to `heroStore.ts` that resets `levelToPower`, `powerNameToLevel`, `totalSlotsAdded`, `heroName`, `isDirty`, and optionally `selectedPrimary`/`selectedSecondary`/pools.
- **UI**: Add an icon button (e.g. `Trash2` or `FileX` from lucide-react) in the header's app controls section.

### 5.2 Confirmation dialog for destructive actions
- **Trigger points**:
  - Clearing the current build (5.1)
  - Changing archetype when powers are already selected
  - Changing primary/secondary powerset when powers from the old set are slotted
  - Loading a build when the current build has unsaved changes (`isDirty === true`)
- **Implementation**: Use a confirmation dialog (shadcn/ui `AlertDialog` component). Show what will be lost (e.g. "You have unsaved changes. Load anyway?").
- **Files**: Create a reusable `ConfirmDialog` component or use shadcn's `AlertDialog` inline. Hook it into `heroStore.ts` actions for archetype/powerset changes and the load flow.

---

## 6. Simulation & Calculation Tools

### 6.1 Proc chance calculation
- **Description**: Calculate the proc chance for proc enhancements (special enhancements that have a chance to trigger an additional effect, like bonus damage or a debuff).
- **Formula** (PPM — Procs Per Minute system):
  - `proc_chance = PPM * (recharge_time + cast_time) / 60`
  - Capped at 90% per activation
  - For AoE powers, divided by `(1 + radius/100)` or number of targets (varies by era)
  - Toggle/auto powers use a different formula based on activation period
- **Backend**: Add a new Tauri command `calculate_proc_chance` that takes the power's recharge, cast time, area, and the proc's PPM value, and returns the proc chance percentage.
- **Frontend**: Show proc chance in the PowerHoverCard when a proc enhancement is slotted, and optionally in a dedicated Proc Calculator panel.

### 6.2 DPS calculator
- **Description**: Calculate damage per second for attack chains.
- **Features**:
  - Single-power DPS: `damage / (cast_time + recharge_time)` for a single attack on repeat
  - Attack chain DPS: given a rotation of powers, calculate optimal DPS considering overlapping recharge times
  - Factor in: base damage, enhancement-boosted damage, proc damage, critical hit chance (AT-dependent), recharge reduction, cast times
- **Backend**: This is a good candidate for a Rust command since it involves optimization (finding the best attack chain). Could be a foundation for the future simulation engine.
- **Frontend**: A dedicated tab or panel where users can select powers for their attack chain, reorder them, and see DPS output.

### 6.3 AI-powered build advisor
- **Description**: A conversational AI advisor integrated into the app that can suggest enhancements, analyze builds, and recommend improvements.
- **Features**:
  - Given a build's powers and current enhancements, suggest optimal IO set slotting
  - Analyze a completed build and highlight strengths, weaknesses, and gaps (e.g. "Your defense is 32% — 13% short of soft cap. Consider slotting [set X] in [power Y] for +3% Def")
  - Answer questions about game mechanics
  - Recommend power picks for a given AT and playstyle
- **Implementation**: This is a large feature. Could use Claude API (Anthropic SDK) with the build data as context. Consider a chat-style panel in the app.
- **Priority**: Low — this is a future/aspirational feature.

### 6.4 Build branching and comparison
- **Description**: Fork a hero build into multiple variants to try different enhancement loadouts and compare stats side-by-side.
- **Features**:
  - Create a "branch" from the current build (copies all power selections and enhancements)
  - Edit enhancements in the branch independently
  - Compare two or more branches side-by-side (stats diff, DPS diff, defense/resistance comparison)
  - Merge: apply a branch's enhancements back to the main build
  - Name branches for clarity (e.g. "Softcap Defense", "Max DPS", "Endurance Focused")
- **Data model**: Store branches as separate `levelToPower` snapshots in the Zustand store. Each branch shares the same archetype/powerset/power selections but has its own enhancement slots.
- **UI**: A branch selector in the header or a dedicated panel. A comparison view showing stat differences highlighted in green (better) / red (worse).
- **Priority**: Medium — useful but complex.

---

## 7. Right Panel — Placeholder Tabs

### ~~7.1 Inherents tab~~ ✅
- **File**: `src/components/planner/RightPanel.tsx:39-42` (currently "Coming soon" placeholder)
- **Description**: Show the selected archetype's inherent powers (e.g. Scrapper's Critical Hits, Tanker's Gauntlet, Dominator's Domination).
- **Data**: Inherent powers are in the database as powers belonging to inherent powersets. Need to identify which powerset category contains inherents for each AT.
- **Display**: List inherent powers with icons, names, and descriptions. These are informational only (not slottable in most cases).

### ~~7.2 Incarnates tab~~ ✅ (placeholder)
- **File**: `src/components/planner/RightPanel.tsx:44-48` (currently "Coming soon" placeholder)
- **Description**: The incarnate system — 6 slots (Alpha, Judgement, Interface, Lore, Destiny, Hybrid) for endgame characters.
- **Features**: Select incarnate abilities for each slot, show their effects, factor Alpha slot's global boost into total stats calculation.
- **Data**: Incarnate data needs to be identified in the game data zip and migrated to SQLite.
- **Priority**: Medium — endgame feature, less critical for basic build planning.

### ~~7.3 Accolades tab~~ ✅ (placeholder)
- **File**: `src/components/planner/RightPanel.tsx:50-54` (currently "Coming soon" placeholder)
- **Description**: Accolade powers that grant passive bonuses (e.g. Atlas Medallion: +Max HP/End).
- **Features**: Toggle accolades on/off, include their effects in total stats calculation.
- **Data**: Accolade powers are in the database but need to be identified and categorized.

---

## 8. Misc UI

### ~~8.1 Donate button~~ ✅
- **File**: `src/components/planner/Header.tsx` or `src/components/planner/Settings.tsx`
- **Description**: A small icon button (e.g. heart icon from lucide-react) that opens an external donation page in the user's default browser.
- **Implementation**: Use Tauri's `shell.open()` to open the URL in the default browser (not an in-app webview). Place it in the header or settings popover.
- **Needs**: The donation page URL (Ko-fi, GitHub Sponsors, etc.) — to be provided.

---

## Priority Order (suggested)

1. **Quick wins**: 1.1, 1.2, 2.2, 3.1, 5.1, 8.1
2. **Core functionality**: 2.3, 2.4, 2.5, 4.3, 4.4, 5.2
3. **UI polish**: 3.2, 3.3, 4.1, 4.2, 4.5
4. **New features**: 2.1, 6.1, 6.2, 7.1, 7.3
5. **Large features**: 6.4, 7.2, 6.3
