# HeroPlanner v2 — TODO

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
