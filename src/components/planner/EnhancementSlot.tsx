import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useHeroStore } from '@/stores/heroStore';
import { imageUrl } from '@/lib/images';
import { Minus } from 'lucide-react';
import { Tip } from '@/components/ui/tooltip';
import { EnhancementPicker } from './EnhancementPicker';
import { EnhancementHoverCard } from './EnhancementHoverCard';
import type { BoostView } from '@/types/models';

interface EnhancementSlotProps {
  powerFullName: string;
  slotIndex: number;
  boost: BoostView | null;
  isEmpty: boolean;
  onAllocate?: () => void;
  canAllocate?: boolean;
  onRemove?: () => void;
  canRemove?: boolean;
  isInherent?: boolean;
}

export function EnhancementSlot({ powerFullName, slotIndex, boost, isEmpty, onAllocate, canAllocate, onRemove, canRemove, isInherent }: EnhancementSlotProps) {
  const [open, setOpen] = useState(false);
  const setDetailPaneTarget = useHeroStore((s) => s.setDetailPaneTarget);
  const removeBoostFromSlot = useHeroStore((s) => s.removeBoostFromSlot);
  const removeInherentBoost = useHeroStore((s) => s.removeInherentBoost);

  // Unallocated socket — clickable to allocate a slot
  if (isEmpty) {
    return (
      <Tip content="Click to allocate slot">
        <button
          className="w-[2.5rem] h-[2.5rem] rounded-full bg-coh-dark/80 border border-border/20 shadow-[inset_0_0.125rem_0.25rem_rgba(0,0,0,0.5)] hover:border-coh-info/40 hover:bg-coh-dark/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={onAllocate}
          disabled={!canAllocate}
        />
      </Tip>
    );
  }

  const levelBadge = boost && boost.level && !boost.isAttuned ? (
    <span className="absolute -bottom-0.5 -right-0.5 min-w-[0.875rem] h-[0.875rem] flex items-center justify-center rounded-full bg-coh-dark border border-border/40 text-[0.5rem] font-bold text-white/90 leading-none z-10 px-0.5">
      {boost.level}
    </span>
  ) : null;

  const boostBadge = boost && boost.boostLevel > 0 ? (
    <span className="absolute -top-0.5 -right-0.5 min-w-[0.875rem] h-[0.875rem] flex items-center justify-center rounded-full bg-cyan-600 border border-cyan-400/50 text-[0.5rem] font-bold text-white leading-none z-10 px-0.5">
      +{boost.boostLevel}
    </span>
  ) : null;

  const slotButton = boost?.icon ? (
    <button
      className={`relative w-[2.5rem] h-[2.5rem] flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80 rounded-full ${
        boost.isAttuned ? 'ring-2 ring-amber-400 shadow-[0_0_0.5rem_rgba(245,158,11,0.4)] attuned-glow' : ''
      }`}
    >
      <img src={imageUrl(boost.icon)} alt={boost.computedName ?? ''} className="w-[2.5rem] h-[2.5rem]" />
      {levelBadge}
      {boostBadge}
    </button>
  ) : (
    <button
      className="w-[2.5rem] h-[2.5rem] rounded-full flex items-center justify-center transition-colors cursor-pointer bg-coh-dark border-2 border-coh-gradient1/40 shadow-[inset_0_0.125rem_0.375rem_rgba(0,0,0,0.7)] hover:border-coh-gradient1/70 hover:shadow-[inset_0_0.125rem_0.375rem_rgba(0,0,0,0.7),0_0_0.375rem_rgba(59,130,246,0.2)]"
    />
  );

  const handleEnhancementHover = () => {
    if (boost) {
      setDetailPaneTarget({ type: 'enhancement', key: boost.boostKey, powerName: powerFullName });
    }
  };

  const content = (
    <div className="relative group/slot" onMouseEnter={handleEnhancementHover}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {slotButton}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <EnhancementPicker
            powerFullName={powerFullName}
            slotIndex={slotIndex}
            onSelect={() => setOpen(false)}
            isInherent={isInherent}
          />
        </PopoverContent>
      </Popover>
      {canRemove && onRemove && (
        <Tip content={boost ? "Remove enhancement" : "Remove slot"}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (boost) {
                const clearBoost = isInherent ? removeInherentBoost : removeBoostFromSlot;
                clearBoost(powerFullName, slotIndex);
              } else {
                onRemove();
              }
            }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive border border-destructive flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity z-10 hover:brightness-125"
          >
            <Minus className="h-2.5 w-2.5 text-white" />
          </button>
        </Tip>
      )}
    </div>
  );

  if (boost && !open) {
    return (
      <EnhancementHoverCard boost={boost} side="top">
        {content}
      </EnhancementHoverCard>
    );
  }

  return content;
}
