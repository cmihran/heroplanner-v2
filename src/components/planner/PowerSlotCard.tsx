import { useState, useCallback, type DragEvent } from 'react';
import { useHeroStore, type SelectedPower } from '@/stores/heroStore';
import { imageUrl } from '@/lib/images';
import { Check, Plus } from 'lucide-react';
import { EnhancementSlot } from './EnhancementSlot';
import { PowerHoverCard } from './PowerHoverCard';

interface PowerSlotCardProps {
  level: number;
  selectedPower: SelectedPower | null;
}

export function PowerSlotCard({ level, selectedPower }: PowerSlotCardProps) {
  const addSlot = useHeroStore((s) => s.addSlot);
  const removeSlotAt = useHeroStore((s) => s.removeSlotAt);
  const canAddMore = useHeroStore((s) => s.canAddMoreSlots);
  const swapPowerLevels = useHeroStore((s) => s.swapPowerLevels);
  const togglePowerActive = useHeroStore((s) => s.togglePowerActive);

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
      <div
        className={`ml-4 rounded-full border border-border/30 bg-coh-dark/50 pl-8 pr-3 pt-1 pb-2 transition-colors ${dragOver ? 'border-coh-primary/70 bg-coh-primary/10' : ''}`}
        {...dragProps}
      >
        <p className="text-sm text-muted-foreground">Level {level} — Empty</p>
        <p className="text-[0.625rem] leading-tight min-h-[2.5em]">&nbsp;</p>
      </div>
    );
  }

  const { power, numSlots, isActive } = selectedPower;
  const showToggle = power.has_self_effects;

  const hasSlots = power.max_boosts > 0;

  return (
    <div
      className={`group transition-colors ${!isActive && showToggle ? 'opacity-50 saturate-50' : ''}`}
      draggable
      onDragStart={handleDragStart}
      {...dragProps}
    >
      {/* Power info bar — pill shape with protruding icon */}
      <div className="relative ml-4">
        {/* Pill bar */}
        <div className={`rounded-full border bg-gradient-to-r from-coh-gradient2/80 to-coh-gradient2/40 ${dragOver ? 'border-coh-primary/70 bg-coh-primary/10' : 'border-coh-secondary/50'}`}>
          <div className="flex items-center gap-2 pl-8 pr-3 pt-1 pb-2 bg-gradient-to-b from-white/8 via-transparent to-black/25 rounded-full">
            <PowerHoverCard powerFullName={power.full_name}>
              <div className="min-w-0 flex-1 cursor-help">
                <div className="flex items-center gap-1.5">
                  <span className="font-hero text-sm tracking-wide truncate">{power.display_name}</span>
                  <span className="text-[0.625rem] text-muted-foreground shrink-0">Lv{level}</span>
                </div>
                <p className="text-[0.625rem] leading-tight text-muted-foreground/70 line-clamp-2 min-h-[2.5em]">{power.display_short_help || '\u00A0'}</p>
              </div>
            </PowerHoverCard>
            {showToggle && (
              <button
                onClick={(e) => { e.stopPropagation(); togglePowerActive(power.full_name); }}
                className={`ml-auto w-5 h-5 rounded-full shrink-0 border flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-green-600 border-green-400 shadow-[0_0_0.375rem_rgba(34,197,94,0.4)]'
                    : 'bg-muted border-muted-foreground/40'
                }`}
                title={isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}
              >
                {isActive && <Check className="h-3 w-3 text-white" />}
              </button>
            )}
          </div>
        </div>

        {/* Power icon — overlaps left edge of pill, centered vertically */}
        <img
          src={imageUrl(power.icon)}
          alt=""
          draggable={false}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full cursor-grab ring-2 ring-coh-secondary/60 shadow-[0_0_0.375rem_rgba(0,0,0,0.6)]"
        />
      </div>

      {/* Enhancement slots — overlapping bottom of pill */}
      {hasSlots && (
        <div className="flex items-center gap-1 ml-4 pl-7 -mt-2 relative z-10">
          {/* Allocated slots */}
          {Array.from({ length: numSlots }, (_, i) => (
            <EnhancementSlot
              key={i}
              powerFullName={power.full_name}
              slotIndex={i}
              boost={selectedPower.boosts[i] || null}
              isEmpty={false}
              onRemove={() => removeSlotAt(power.full_name, i)}
              canRemove={numSlots > 1}
            />
          ))}
          {/* Ghost add button — visible on hover */}
          {numSlots < power.max_boosts && canAddMore() && (
            <button
              onClick={() => addSlot(power.full_name)}
              className="w-[2.25rem] h-[2.25rem] rounded-full border-2 border-dashed border-coh-info/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-coh-info/60 hover:bg-coh-secondary/20"
              title="Add enhancement slot"
            >
              <Plus className="h-3.5 w-3.5 text-coh-info/50" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
