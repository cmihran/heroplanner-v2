import { useState, useCallback, type DragEvent } from 'react';
import { useHeroStore, type SelectedPower } from '@/stores/heroStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { imageUrl } from '@/lib/images';
import { Plus, Minus, GripVertical } from 'lucide-react';
import { EnhancementSlot } from './EnhancementSlot';
import { PowerHoverCard } from './PowerHoverCard';

interface PowerSlotCardProps {
  level: number;
  selectedPower: SelectedPower | null;
}

export function PowerSlotCard({ level, selectedPower }: PowerSlotCardProps) {
  const addSlot = useHeroStore((s) => s.addSlot);
  const removeSlot = useHeroStore((s) => s.removeSlot);
  const canAddMore = useHeroStore((s) => s.canAddMoreSlots);
  const swapPowerLevels = useHeroStore((s) => s.swapPowerLevels);

  const [dragOver, setDragOver] = useState(false);

  const handleDragStart = useCallback((e: DragEvent) => {
    e.dataTransfer.setData('text/plain', String(level));
    e.dataTransfer.effectAllowed = 'move';
  }, [level]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const fromLevel = Number(e.dataTransfer.getData('text/plain'));
    if (!isNaN(fromLevel) && fromLevel !== level) {
      swapPowerLevels(fromLevel, level);
    }
  }, [level, swapPowerLevels]);

  const dragProps = {
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  if (!selectedPower) {
    return (
      <Card
        className={`bg-coh-dark/50 border-border/30 transition-colors ${dragOver ? 'border-coh-primary/70 bg-coh-primary/10' : ''}`}
        {...dragProps}
      >
        <CardHeader className="p-3">
          <CardTitle className="text-sm text-muted-foreground">
            Level {level}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-xs text-muted-foreground italic">Empty</p>
        </CardContent>
      </Card>
    );
  }

  const { power, numSlots } = selectedPower;

  return (
    <Card
      className={`bg-gradient-to-b from-coh-gradient1/20 to-coh-gradient2/40 border-coh-secondary/50 transition-colors ${dragOver ? 'border-coh-primary/70 bg-coh-primary/10' : ''}`}
      draggable
      onDragStart={handleDragStart}
      {...dragProps}
    >
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />
          <span className="text-xs text-muted-foreground">Lv{level}</span>
          <PowerHoverCard powerFullName={power.full_name}>
            <span className="flex items-center gap-2 cursor-help">
              <img src={imageUrl(power.icon)} alt="" className="w-5 h-5" />
              <span className="shrink-0">{power.display_name}</span>
            </span>
          </PowerHoverCard>
          {power.display_short_help && (
            <span className="text-[0.625rem] text-muted-foreground truncate font-normal">{power.display_short_help}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">

        {/* Enhancement slots */}
        {power.max_boosts > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {Array.from({ length: numSlots }, (_, i) => (
                <EnhancementSlot
                  key={i}
                  powerFullName={power.full_name}
                  slotIndex={i}
                  boost={selectedPower.boosts[i] || null}
                  isEmpty={false}
                />
              ))}
              {Array.from({ length: power.max_boosts - numSlots }, (_, i) => (
                <EnhancementSlot
                  key={`empty-${i}`}
                  powerFullName={power.full_name}
                  slotIndex={numSlots + i}
                  boost={null}
                  isEmpty={true}
                />
              ))}
            </div>
            <div className="flex gap-0.5 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={() => addSlot(power.full_name)}
                disabled={numSlots >= power.max_boosts || !canAddMore()}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={() => removeSlot(power.full_name)}
                disabled={numSlots <= 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
