import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useHeroStore } from '@/stores/heroStore';
import { imageUrl } from '@/lib/images';
import { IO_ICONS } from '@/lib/enhancement-data';
import { BoostSetBrowser } from './BoostSetBrowser';
import type { PowerDetail } from '@/types/models';

interface EnhancementPickerProps {
  powerFullName: string;
  slotIndex: number;
  onSelect: () => void;
}

export function EnhancementPicker({ powerFullName, slotIndex, onSelect }: EnhancementPickerProps) {
  const fetchPowerDetail = useHeroStore((s) => s.fetchPowerDetail);
  const setBoostInSlot = useHeroStore((s) => s.setBoostInSlot);
  const removeBoostFromSlot = useHeroStore((s) => s.removeBoostFromSlot);
  const powerNameToLevel = useHeroStore((s) => s.powerNameToLevel);
  const levelToPower = useHeroStore((s) => s.levelToPower);

  const [detail, setDetail] = useState<PowerDetail | null>(null);

  const level = powerNameToLevel[powerFullName];
  const selected = level !== undefined ? levelToPower[level] : null;
  const currentBoost = selected?.boosts[slotIndex] ?? null;

  useEffect(() => {
    fetchPowerDetail(powerFullName).then(setDetail);
  }, [powerFullName, fetchPowerDetail]);

  const handleIOClick = (boostName: string) => {
    const icon = IO_ICONS[boostName] ?? null;
    setBoostInSlot(powerFullName, slotIndex, {
      boostKey: boostName,
      icon,
      computedName: boostName,
      setName: null,
      level: 50,
      isAttuned: false,
    });
    onSelect();
  };

  const handleClear = () => {
    removeBoostFromSlot(powerFullName, slotIndex);
    onSelect();
  };

  const handleLevelChange = (newLevel: number) => {
    if (!currentBoost) return;
    setBoostInSlot(powerFullName, slotIndex, { ...currentBoost, level: newLevel, isAttuned: false });
  };

  const handleAttunedToggle = () => {
    if (!currentBoost) return;
    const nowAttuned = !currentBoost.isAttuned;
    setBoostInSlot(powerFullName, slotIndex, {
      ...currentBoost,
      isAttuned: nowAttuned,
      level: nowAttuned ? null : 50,
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
      {currentBoost && (
        <div className="px-3 pb-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-[0.625rem] text-muted-foreground">Lv</label>
            <input
              type="number"
              min={1}
              max={50}
              value={currentBoost.isAttuned ? '' : (currentBoost.level ?? 50)}
              disabled={currentBoost.isAttuned}
              onChange={(e) => handleLevelChange(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              className="w-12 h-6 text-xs text-center bg-coh-dark border border-border/40 rounded px-1 disabled:opacity-40"
            />
          </div>
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
        </div>
      )}
      <Tabs defaultValue="io" className="px-3 pb-3">
        <TabsList className="w-full">
          <TabsTrigger value="io" className="flex-1 text-xs">IO</TabsTrigger>
          <TabsTrigger value="sets" className="flex-1 text-xs">Sets</TabsTrigger>
        </TabsList>
        <TabsContent value="io">
          <div className="max-h-64 overflow-y-auto flex flex-col gap-0.5">
            {detail.boosts_allowed.map((boost) => (
              <button
                key={boost}
                onClick={() => handleIOClick(boost)}
                className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-coh-secondary/30 transition-colors text-left"
              >
                {IO_ICONS[boost] && (
                  <img src={imageUrl(IO_ICONS[boost])} alt="" className="w-4 h-4" />
                )}
                <span>{boost}</span>
              </button>
            ))}
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
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
