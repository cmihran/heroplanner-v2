import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { useHeroStore, toSetBoostInput } from '@/stores/heroStore';
import { api } from '@/lib/api';
import { BoostSetBrowser } from './BoostSetBrowser';
import type { PowerDetail, EnhancementStrength, BoostView } from '@/types/models';

interface EnhancementPickerProps {
  powerFullName: string;
  slotIndex: number;
  onSelect: () => void;
  isInherent?: boolean;
}

export function EnhancementPicker({ powerFullName, slotIndex, onSelect, isInherent }: EnhancementPickerProps) {
  const fetchPowerDetail = useHeroStore((s) => s.fetchPowerDetail);
  const setBoostInSlot = useHeroStore((s) => s.setBoostInSlot);
  const removeBoostFromSlot = useHeroStore((s) => s.removeBoostFromSlot);
  const setInherentBoost = useHeroStore((s) => s.setInherentBoost);
  const removeInherentBoost = useHeroStore((s) => s.removeInherentBoost);
  const buildView = useHeroStore((s) => s.buildView);
  const archetype = useHeroStore((s) => s.archetype);

  const [detail, setDetail] = useState<PowerDetail | null>(null);
  const [ioStrengths, setIoStrengths] = useState<Record<string, EnhancementStrength[]>>({});
  const [currentStrengths, setCurrentStrengths] = useState<EnhancementStrength[] | null>(null);

  const currentBoost: BoostView | null = (() => {
    if (!buildView) return null;
    if (isInherent) return buildView.inherentSlots[powerFullName]?.boosts[slotIndex] ?? null;
    const pv = buildView.powers.find((p) => p.powerFullName === powerFullName);
    return pv?.boosts[slotIndex] ?? null;
  })();

  useEffect(() => {
    fetchPowerDetail(powerFullName).then(setDetail);
  }, [powerFullName, fetchPowerDetail]);

  // Fetch enhancement % for IO enhancements — reflects current boost's level/boostLevel
  const ioLevel = currentBoost ? (currentBoost.isAttuned ? 49 : (currentBoost.level ?? 50) - 1) : 49;
  const ioBoostLevel = currentBoost?.boostLevel ?? 0;
  useEffect(() => {
    if (!detail || !archetype) return;
    let cancelled = false;
    const fetchStrengths = async () => {
      const results: Record<string, EnhancementStrength[]> = {};
      for (const boostName of detail.boosts_allowed) {
        try {
          const strengths = await api.getEnhancementValues(archetype.id, boostName, ioLevel, false, ioBoostLevel);
          if (!cancelled) results[boostName] = strengths;
        } catch { /* skip */ }
      }
      if (!cancelled) setIoStrengths(results);
    };
    fetchStrengths();
    return () => { cancelled = true; };
  }, [detail, archetype, ioLevel, ioBoostLevel]);

  // Fetch enhancement strengths for the currently slotted boost (reacts to level/boostLevel/attuned changes)
  useEffect(() => {
    if (!currentBoost || !archetype) { setCurrentStrengths(null); return; }
    let cancelled = false;
    const baseLevel = currentBoost.isAttuned ? 49 : (currentBoost.level ?? 50) - 1;
    api.getEnhancementValues(archetype.id, currentBoost.boostKey, baseLevel, currentBoost.isAttuned, currentBoost.boostLevel ?? 0)
      .then((s) => { if (!cancelled) setCurrentStrengths(s); })
      .catch(() => { if (!cancelled) setCurrentStrengths(null); });
    return () => { cancelled = true; };
  }, [currentBoost?.boostKey, currentBoost?.level, currentBoost?.boostLevel, currentBoost?.isAttuned, archetype]);

  const slotBoost = isInherent ? setInherentBoost : setBoostInSlot;
  const clearBoost = isInherent ? removeInherentBoost : removeBoostFromSlot;

  const handleIOClick = (boostName: string) => {
    slotBoost(powerFullName, slotIndex, {
      boostKey: boostName,
      setName: null,
      setGroupName: null,
      level: 50,
      isAttuned: false,
      boostLevel: 0,
    });
    onSelect();
  };

  const handleClear = () => {
    clearBoost(powerFullName, slotIndex);
    onSelect();
  };

  // Fetch set detail for level clamping when a set enhancement is slotted
  const fetchBoostSetDetail = useHeroStore((s) => s.fetchBoostSetDetail);
  const [boostSetInfo, setBoostSetInfo] = useState<import('@/types/models').BoostSetDetail | null>(null);
  useEffect(() => {
    if (currentBoost?.setName) {
      fetchBoostSetDetail(currentBoost.setName).then(setBoostSetInfo);
    } else {
      setBoostSetInfo(null);
    }
  }, [currentBoost?.setName, fetchBoostSetDetail]);

  const isArchetypeSet = currentBoost?.setGroupName === 'Archetype';

  const handleLevelChange = (newLevel: number) => {
    if (!currentBoost) return;
    // Clamp level to set's min/max range
    let clamped = newLevel;
    if (boostSetInfo) {
      clamped = Math.max(boostSetInfo.min_level, Math.min(boostSetInfo.max_level, clamped));
    }
    slotBoost(powerFullName, slotIndex, { ...toSetBoostInput(currentBoost), level: clamped, isAttuned: false, boostLevel: currentBoost.boostLevel });
  };

  const handleAttunedToggle = () => {
    if (!currentBoost) return;
    // Archetype enhancements can't be un-attuned
    if (isArchetypeSet) return;
    const nowAttuned = !currentBoost.isAttuned;
    const defaultLevel = boostSetInfo?.max_level ?? 50;
    slotBoost(powerFullName, slotIndex, {
      ...toSetBoostInput(currentBoost),
      isAttuned: nowAttuned,
      level: nowAttuned ? null : defaultLevel,
      boostLevel: nowAttuned ? 0 : currentBoost.boostLevel,
    });
  };

  if (!detail) {
    return <div className="p-3 text-xs text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <p className="text-xs font-medium">Slot {slotIndex + 1}: {detail.display_name}</p>
        {currentBoost && (
          <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>
      {currentBoost && (<>
        <div className="px-3 pb-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-[0.625rem] text-muted-foreground">Lv</label>
            <input
              type="number"
              min={boostSetInfo?.min_level ?? 1}
              max={boostSetInfo?.max_level ?? 50}
              value={currentBoost.isAttuned ? '' : (currentBoost.level ?? 50)}
              disabled={currentBoost.isAttuned}
              onChange={(e) => handleLevelChange(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              className="w-12 h-6 text-xs text-center bg-coh-dark border border-border/40 rounded px-1 disabled:opacity-40"
            />
          </div>
          {!isArchetypeSet && (
            <Tip content={currentBoost.isAttuned ? 'Attuned — scales to your level' : 'Click to attune'}>
              <button
                onClick={handleAttunedToggle}
                className={`h-6 px-2 text-[0.625rem] rounded border transition-colors ${
                  currentBoost.isAttuned
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-coh-dark border-border/40 text-muted-foreground hover:border-amber-500/40'
                }`}
              >
                Attuned
              </button>
            </Tip>
          )}
          {isArchetypeSet && (
            <span className="h-6 px-2 text-[0.625rem] rounded border bg-amber-500/20 border-amber-500/50 text-amber-400 flex items-center">
              Attuned
            </span>
          )}
          {/* IO Boosters: any non-attuned IO enhancement */}
          {!currentBoost.isAttuned && (
            <div className="flex items-center gap-1">
              <Tip content="Remove IO booster">
                <button
                  onClick={() => {
                    const newLevel = Math.max(0, currentBoost.boostLevel - 1);
                    slotBoost(powerFullName, slotIndex, { ...toSetBoostInput(currentBoost), boostLevel: newLevel });
                  }}
                  disabled={currentBoost.boostLevel <= 0}
                  className="w-5 h-5 flex items-center justify-center rounded text-xs bg-coh-dark border border-border/40 text-muted-foreground hover:text-white disabled:opacity-30 transition-colors"
                >
                  −
                </button>
              </Tip>
              <span className={`text-[0.625rem] min-w-[1.5rem] text-center ${currentBoost.boostLevel > 0 ? 'text-cyan-400 font-bold' : 'text-muted-foreground'}`}>
                +{currentBoost.boostLevel}
              </span>
              <Tip content="Add IO booster">
                <button
                  onClick={() => {
                    const newLevel = Math.min(5, currentBoost.boostLevel + 1);
                    slotBoost(powerFullName, slotIndex, { ...toSetBoostInput(currentBoost), boostLevel: newLevel });
                  }}
                  disabled={currentBoost.boostLevel >= 5}
                  className="w-5 h-5 flex items-center justify-center rounded text-xs bg-coh-dark border border-border/40 text-muted-foreground hover:text-white disabled:opacity-30 transition-colors"
                >
                  +
                </button>
              </Tip>
            </div>
          )}
        </div>
        {currentStrengths && currentStrengths.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-x-3 gap-y-0.5">
            {currentStrengths.map((s, i) => (
              <span key={i} className="text-[0.625rem]">
                <span className="text-muted-foreground">{s.displayAttrib}:</span>{' '}
                <span className="text-coh-info">{s.displayStrength}</span>
              </span>
            ))}
          </div>
        )}
      </>)}
      <Tabs defaultValue="io" className="px-3 pb-3">
        <TabsList className="w-full">
          <TabsTrigger value="io" className="flex-1 text-xs">IO</TabsTrigger>
          <TabsTrigger value="sets" className="flex-1 text-xs">Sets</TabsTrigger>
        </TabsList>
        <TabsContent value="io">
          <div className="max-h-64 overflow-y-auto flex flex-col gap-0.5">
            {detail.boosts_allowed.map((boost) => {
              const strengths = ioStrengths[boost];
              const pctLabel = strengths?.length
                ? strengths.map((s) => s.displayStrength).join(', ')
                : null;
              return (
                <button
                  key={boost}
                  onClick={() => handleIOClick(boost)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-coh-secondary/30 transition-colors text-left"
                >
                  <span className="flex-1">{boost}</span>
                  {pctLabel && (
                    <span className="text-coh-info/70 text-[0.625rem] shrink-0">{pctLabel}</span>
                  )}
                </button>
              );
            })}
            {detail.boosts_allowed.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">No IOs available.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="sets">
          <BoostSetBrowser
            allowedCategories={detail.allowed_boostset_cats}
            powerFullName={powerFullName}
            slotIndex={slotIndex}
            onSelect={onSelect}
            isInherent={isInherent}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
