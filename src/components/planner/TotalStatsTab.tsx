import { useState } from 'react';
import { useHeroStore } from '@/stores/heroStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, Shield, Blocks, Crosshair, Footprints, ShieldCheck, Heart, Settings, Hammer, Sword, Flame, Snowflake, Zap, Skull, Brain, FlaskConical, Swords, Target, Expand } from 'lucide-react';
import type { CombinedStat, StatCap, StatSource, TotalStatsResult } from '@/types/models';

const CATEGORY_ORDER = ['Offense', 'Defense', 'Resistance', 'Movement', 'Status Resistance', 'Recovery', 'Misc'];
const VITAL_LABELS = new Set(['Max HP', 'Regeneration', 'Max End', 'Recovery', 'End Reduction']);

const SHIMMER_KEY = 'heroplanner-shimmer';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Defense': Shield,
  'Resistance': Blocks,
  'Offense': Crosshair,
  'Damage': Swords,
  'Movement': Footprints,
  'Status Resistance': ShieldCheck,
  'Recovery': Heart,
  'Misc': Settings,
};

const DAMAGE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Smashing': Hammer,
  'Lethal': Sword,
  'Fire': Flame,
  'Cold': Snowflake,
  'Energy': Zap,
  'Negative Energy': Skull,
  'Psionic': Brain,
  'Toxic': FlaskConical,
  'Melee': Swords,
  'Ranged': Target,
  'AoE': Expand,
};

const DEFENSE_BAR_COLOR = 'rgba(168,85,247,0.25)';
const DEFENSE_SOFT_CAP = 0.45; // 45%
const SOFT_CAP_BAR_PCT = 75;   // 45% maps to 75% of bar width

function groupByCategory(stats: CombinedStat[]): Record<string, CombinedStat[]> {
  const groups: Record<string, CombinedStat[]> = {};
  for (const stat of stats) {
    if (!groups[stat.category]) groups[stat.category] = [];
    groups[stat.category].push(stat);
  }
  const POSITIONAL = new Set(['Melee', 'Ranged', 'AoE']);
  for (const [category, entries] of Object.entries(groups)) {
    if (category === 'Defense') {
      // Damage types alphabetical first, then positional at bottom
      entries.sort((a, b) => {
        const aPos = POSITIONAL.has(a.label) ? 1 : 0;
        const bPos = POSITIONAL.has(b.label) ? 1 : 0;
        if (aPos !== bPos) return aPos - bPos;
        return a.label.localeCompare(b.label);
      });
    } else {
      entries.sort((a, b) => a.label.localeCompare(b.label));
    }
  }
  return groups;
}

function StatRow({ stat, barColor, cap, showDamageTypeIcon }: { stat: CombinedStat; barColor?: string; cap?: StatCap; showDamageTypeIcon?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasSources = stat.sources.length > 0;
  const isDefense = barColor === DEFENSE_BAR_COLOR;

  // For defense bars: scale so 45% = 75% bar width
  // For other bars: scale so cap = 100% bar width
  let barPct = 0;
  let overCapPct = 0;
  if (barColor) {
    if (isDefense) {
      const scaleFactor = SOFT_CAP_BAR_PCT / (DEFENSE_SOFT_CAP * 100);
      const rawPct = Math.abs(stat.totalValue) * 100 * scaleFactor;
      if (stat.totalValue > DEFENSE_SOFT_CAP) {
        barPct = SOFT_CAP_BAR_PCT;
        overCapPct = Math.min(rawPct - SOFT_CAP_BAR_PCT, 100 - SOFT_CAP_BAR_PCT);
      } else {
        barPct = Math.min(rawPct, 100);
      }
    } else {
      const barMax = cap ? cap.capValue : 1;
      barPct = Math.min((Math.abs(stat.totalValue) / barMax) * 100, 100);
    }
  }
  const atCap = cap && stat.totalValue >= cap.capValue - 0.001;
  const DmgIcon = showDamageTypeIcon ? DAMAGE_TYPE_ICONS[stat.label] : undefined;

  const Row = hasSources ? 'button' : 'div';

  return (
    <div>
      <Row
        onClick={hasSources ? () => setExpanded(!expanded) : undefined}
        className={`relative w-full flex items-center justify-between text-[0.8125rem] py-1 px-1 rounded overflow-hidden ${hasSources ? 'hover:bg-white/5 cursor-pointer' : ''}`}
      >
        {/* Normal bar fill */}
        {barColor && barPct > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded pointer-events-none transition-[width] duration-500 ease-out"
            style={{ width: `${barPct}%`, backgroundColor: barColor }}
          />
        )}
        {/* Over-cap fill (lighter shade, only for defense) */}
        {isDefense && overCapPct > 0 && (
          <div
            className="absolute inset-y-0 rounded pointer-events-none transition-[width] duration-500 ease-out"
            style={{ left: `${SOFT_CAP_BAR_PCT}%`, width: `${overCapPct}%`, backgroundColor: 'rgba(168,85,247,0.12)' }}
          />
        )}
        {/* Soft cap marker line (defense only) */}
        {isDefense && (
          <div
            className="absolute inset-y-0 pointer-events-none"
            style={{ left: `${SOFT_CAP_BAR_PCT}%`, width: '0.0625rem', backgroundColor: 'rgba(168,85,247,0.5)' }}
          />
        )}
        <span className="relative flex items-center gap-1.5 text-slate-300">
          {hasSources && (
            <ChevronRight className={`h-3 w-3 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          )}
          {!hasSources && <span className="w-3" />}
          {DmgIcon && <DmgIcon className="h-3 w-3 opacity-60" />}
          {stat.label}
        </span>
        <span className="relative font-mono text-slate-100">
          {stat.displayValue}
          {cap && (
            <span className={`text-[0.625rem] ml-1 ${atCap ? 'text-amber-400' : 'text-slate-500'}`}>
              / {cap.displayCap}
            </span>
          )}
        </span>
      </Row>
      {expanded && (
        <div className="ml-7 mb-1 space-y-0.5">
          {stat.sources.map((src) => (
            <div key={src.source} className="flex items-center justify-between text-[0.6875rem] py-0.5 px-1">
              <span className="text-slate-500">{src.source}</span>
              <span className="font-mono text-slate-400">{src.displayValue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SourceGroup({ label, sources, color }: { label: string; sources: StatSource[]; color: 'emerald' | 'blue' }) {
  if (sources.length === 0) return null;
  return (
    <div>
      <div className={`text-[0.625rem] font-medium pt-0.5 ${color === 'emerald' ? 'text-emerald-600/50' : 'text-blue-600/50'}`}>
        {label}
      </div>
      {sources.map((src) => (
        <div key={src.source} className="flex justify-between text-[0.6875rem] py-px">
          <span className={color === 'emerald' ? 'text-emerald-600/80' : 'text-blue-600/80'}>{src.source}</span>
          <span className={`font-mono ${color === 'emerald' ? 'text-emerald-500/70' : 'text-blue-500/70'}`}>{src.displayValue}</span>
        </div>
      ))}
    </div>
  );
}

function VitalBars({ result }: { result: TotalStatsResult }) {
  const [hpExpanded, setHpExpanded] = useState(false);
  const [endExpanded, setEndExpanded] = useState(false);
  const [shimmerEnabled] = useState(() => {
    const stored = localStorage.getItem(SHIMMER_KEY);
    return stored === null ? true : stored === 'true';
  });

  const { effectiveHp, hpPerSec, baseHp, effectiveEnd, endPerSec, baseEnd, endDrain, combinedStats } = result;
  const netEnd = endPerSec - endDrain;

  const find = (label: string) => combinedStats.find((s) => s.category === 'Recovery' && s.label === label);
  const hpBonus = find('Max HP');
  const regen = find('Regeneration');
  const endBonus = find('Max End');
  const recovery = find('Recovery');
  const endReduct = find('End Reduction');

  if (effectiveHp === 0 && effectiveEnd === 0) return null;

  return (
    <div className="space-y-2">
      {/* Health Bar */}
      {effectiveHp > 0 && (
        <button
          onClick={() => setHpExpanded(!hpExpanded)}
          className="w-full text-left rounded-lg overflow-hidden border border-emerald-500/20 hover:border-emerald-500/30 transition-colors cursor-pointer"
        >
          <div className="relative bg-gradient-to-r from-emerald-900/50 via-emerald-800/30 to-emerald-950/40">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/[0.03] to-transparent pointer-events-none" />

            <div className="relative px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ChevronRight className={`h-3 w-3 text-emerald-600/50 transition-transform ${hpExpanded ? 'rotate-90' : ''}`} />
                  <span className="text-emerald-300 text-[1rem] font-bold">{Math.round(effectiveHp)}</span>
                  <span className="text-emerald-600 text-[0.625rem] font-semibold uppercase tracking-wider">HP</span>
                </div>
                <span className="text-emerald-500/60 text-[0.6875rem] font-mono">
                  +{hpPerSec.toFixed(1)}/s
                </span>
              </div>
            </div>

            <div className="relative h-1 bg-emerald-950/60 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500/50 via-emerald-400/30 to-emerald-600/20 rounded-r-full transition-[width] duration-700 ease-out" />
              {shimmerEnabled && (
                <div className="vital-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent pointer-events-none" />
              )}
            </div>
          </div>

          {hpExpanded && (
            <div className="bg-emerald-950/20 border-t border-emerald-500/10 px-3 py-1.5 space-y-0.5">
              <div className="text-[0.625rem] font-medium pt-0.5 text-emerald-600/50">Max HP</div>
              <div className="flex justify-between text-[0.6875rem] py-px">
                <span className="text-emerald-600/80">Base</span>
                <span className="font-mono text-emerald-500/70">{Math.round(baseHp)}</span>
              </div>
              {hpBonus?.sources.map((src) => (
                <div key={src.source} className="flex justify-between text-[0.6875rem] py-px">
                  <span className="text-emerald-600/80">{src.source}</span>
                  <span className="font-mono text-emerald-500/70">{src.displayValue}</span>
                </div>
              ))}
              <SourceGroup label="Regeneration" sources={regen?.sources || []} color="emerald" />
              <div className="flex justify-between text-[0.6875rem] mt-1 pt-1 border-t border-emerald-500/10">
                <span className="text-emerald-500/70">Regen Rate</span>
                <span className="font-mono text-emerald-400/80">+{hpPerSec.toFixed(2)} HP/s</span>
              </div>
            </div>
          )}
        </button>
      )}

      {/* Endurance Bar */}
      {effectiveEnd > 0 && (
        <button
          onClick={() => setEndExpanded(!endExpanded)}
          className="w-full text-left rounded-lg overflow-hidden border border-blue-500/20 hover:border-blue-500/30 transition-colors cursor-pointer"
        >
          <div className="relative bg-gradient-to-r from-blue-900/50 via-blue-800/30 to-blue-950/40">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/[0.03] to-transparent pointer-events-none" />

            <div className="relative px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ChevronRight className={`h-3 w-3 text-blue-600/50 transition-transform ${endExpanded ? 'rotate-90' : ''}`} />
                  <span className="text-blue-300 text-[1rem] font-bold">{Math.round(effectiveEnd)}</span>
                  <span className="text-blue-600 text-[0.625rem] font-semibold uppercase tracking-wider">END</span>
                </div>
                <span className={`text-[0.6875rem] font-mono px-1.5 rounded ${
                  netEnd >= 0
                    ? 'text-blue-500/60'
                    : 'text-red-400 bg-red-500/10 border border-red-500/20'
                }`}>
                  {netEnd >= 0 ? '+' : ''}{netEnd.toFixed(2)}/s
                </span>
              </div>
            </div>

            <div className="relative h-1 bg-blue-950/60 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500/50 via-blue-400/30 to-blue-600/20 rounded-r-full transition-[width] duration-700 ease-out" />
              {shimmerEnabled && (
                <div className="vital-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-blue-300/20 to-transparent pointer-events-none" />
              )}
              {endDrain > 0 && (
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-red-500/50 to-transparent rounded-l-full"
                  style={{ width: `${Math.min((endDrain / Math.max(endPerSec, 0.01)) * 100, 100)}%` }}
                />
              )}
            </div>
          </div>

          {endExpanded && (
            <div className="bg-blue-950/20 border-t border-blue-500/10 px-3 py-1.5 space-y-0.5">
              <div className="text-[0.625rem] font-medium pt-0.5 text-blue-600/50">Max End</div>
              <div className="flex justify-between text-[0.6875rem] py-px">
                <span className="text-blue-600/80">Base</span>
                <span className="font-mono text-blue-500/70">{Math.round(baseEnd)}</span>
              </div>
              {endBonus?.sources.map((src) => (
                <div key={src.source} className="flex justify-between text-[0.6875rem] py-px">
                  <span className="text-blue-600/80">{src.source}</span>
                  <span className="font-mono text-blue-500/70">{src.displayValue}</span>
                </div>
              ))}
              <SourceGroup label="Recovery" sources={recovery?.sources || []} color="blue" />
              <SourceGroup label="End Reduction" sources={endReduct?.sources || []} color="blue" />
              <div className="mt-1 pt-1 border-t border-blue-500/10 space-y-0.5">
                <div className="flex justify-between text-[0.6875rem]">
                  <span className="text-blue-500/70">Recovery Rate</span>
                  <span className="font-mono text-blue-400/80">+{endPerSec.toFixed(2)}/s</span>
                </div>
                {endDrain > 0 && (
                  <div className="flex justify-between text-[0.6875rem]">
                    <span className="text-red-500/60">Toggle Drain</span>
                    <span className="font-mono text-red-400/70">−{endDrain.toFixed(2)}/s</span>
                  </div>
                )}
                <div className="flex justify-between text-[0.6875rem]">
                  <span className={netEnd >= 0 ? 'text-blue-400/80' : 'text-red-400/80'}>Net</span>
                  <span className={`font-mono ${netEnd >= 0 ? 'text-blue-300/80' : 'text-red-300/80'}`}>
                    {netEnd >= 0 ? '+' : ''}{netEnd.toFixed(2)}/s
                  </span>
                </div>
              </div>
            </div>
          )}
        </button>
      )}
    </div>
  );
}

function DamageSubGroup({ entries }: { entries: CombinedStat[] }) {
  const [expanded, setExpanded] = useState(false);

  // Summary: show the max damage bonus across all types
  const maxDmg = entries.reduce((max, e) => Math.max(max, Math.abs(e.totalValue)), 0);
  const summaryDisplay = maxDmg === 0 ? '0%' : entries[0]?.totalValue === maxDmg && entries.every((e) => e.totalValue === maxDmg)
    ? entries[0].displayValue
    : `up to ${(maxDmg * 100).toFixed(maxDmg * 100 === Math.round(maxDmg * 100) ? 0 : 2)}%`;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="relative w-full flex items-center justify-between text-[0.8125rem] py-1 px-1 rounded overflow-hidden hover:bg-white/5 cursor-pointer"
      >
        <span className="relative flex items-center gap-1.5 text-slate-300">
          <ChevronRight className={`h-3 w-3 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          Damage
        </span>
        <span className="relative font-mono text-slate-100">{summaryDisplay}</span>
      </button>
      {expanded && (
        <div className="ml-4">
          {entries.map((stat) => (
            <StatRow key={stat.label} stat={stat} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({ category, entries, damageEntries, capMap }: { category: string; entries: CombinedStat[]; damageEntries?: CombinedStat[]; capMap?: Map<string, StatCap> }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const barColor = category === 'Defense' ? DEFENSE_BAR_COLOR : category === 'Resistance' ? 'rgba(236,72,153,0.25)' : undefined;
  const hasZeros = (category === 'Defense' || category === 'Resistance') && entries.some((s) => s.totalValue === 0);
  const visible = hasZeros && !showAll ? entries.filter((s) => s.totalValue !== 0 || s.sources.length > 0) : entries;
  const showDmgIcons = category === 'Defense' || category === 'Resistance';
  const CatIcon = CATEGORY_ICONS[category];

  return (
    <div className="rounded-lg overflow-hidden">
      <div className="bg-white/[0.04] flex items-center">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex-1 px-3 py-1.5 flex items-center gap-1.5 hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <ChevronRight className={`h-3 w-3 text-slate-500 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
          {CatIcon && <CatIcon className="h-3 w-3 opacity-50" />}
          <h3 className="text-[0.6875rem] font-semibold text-slate-400 uppercase tracking-wider">
            {category}
          </h3>
        </button>
        {hasZeros && !collapsed && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-2.5 py-1.5 text-[0.625rem] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            {showAll ? 'hide 0%' : 'show all'}
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="px-2 py-1">
          {visible.map((stat) => (
            <StatRow key={stat.label} stat={stat} barColor={barColor} cap={capMap?.get(`${category}|${stat.label}`)} showDamageTypeIcon={showDmgIcons} />
          ))}
          {damageEntries && damageEntries.length > 0 && (
            <DamageSubGroup entries={damageEntries} />
          )}
        </div>
      )}
    </div>
  );
}

export function TotalStatsTab() {
  const archetype = useHeroStore((s) => s.archetype);
  const totalStatsResult = useHeroStore((s) => s.buildView)?.stats ?? null;

  if (!archetype) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Select an archetype to see stats
      </div>
    );
  }

  if (!totalStatsResult || totalStatsResult.combinedStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Activate powers to see stats
      </div>
    );
  }

  const grouped = groupByCategory(totalStatsResult.combinedStats);
  const capMap = new Map(totalStatsResult.statCaps.map((c) => [`${c.category}|${c.label}`, c]));
  const allCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c] || (c === 'Offense' && grouped['Damage'])),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c) && c !== 'Damage'),
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-2">
        {/* Vital Bars — HP/Regen and End/Recovery */}
        <VitalBars result={totalStatsResult} />

        {/* Stat categories */}
        {allCategories.map((category) => {
          let entries = grouped[category] || [];
          const damageEntries = category === 'Offense' ? grouped['Damage'] : undefined;
          if (entries.length === 0 && !damageEntries?.length) return null;
          if (category === 'Recovery') {
            entries = entries.filter((s) => !VITAL_LABELS.has(s.label));
            if (entries.length === 0) return null;
          }
          return (
            <CategorySection key={category} category={category} entries={entries} damageEntries={damageEntries} capMap={capMap} />
          );
        })}
      </div>
    </ScrollArea>
  );
}
