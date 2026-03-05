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
    });
    onSelect();
  };

  const handleClear = () => {
    removeBoostFromSlot(powerFullName, slotIndex);
    onSelect();
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
