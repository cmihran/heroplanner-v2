import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { imageUrl } from '@/lib/images';
import { Minus } from 'lucide-react';
import { EnhancementPicker } from './EnhancementPicker';
import { EnhancementHoverCard } from './EnhancementHoverCard';
import type { SlottedBoost } from '@/types/models';

interface EnhancementSlotProps {
  powerFullName: string;
  slotIndex: number;
  boost: SlottedBoost | null;
  isEmpty: boolean;
  onAllocate?: () => void;
  canAllocate?: boolean;
  onRemove?: () => void;
  canRemove?: boolean;
}

export function EnhancementSlot({ powerFullName, slotIndex, boost, isEmpty, onAllocate, canAllocate, onRemove, canRemove }: EnhancementSlotProps) {
  const [open, setOpen] = useState(false);

  // Unallocated socket — clickable to allocate a slot
  if (isEmpty) {
    return (
      <button
        className="w-[2.25rem] h-[2.25rem] rounded-full bg-coh-dark/80 border border-border/20 shadow-[inset_0_0.125rem_0.25rem_rgba(0,0,0,0.5)] hover:border-coh-info/40 hover:bg-coh-dark/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={onAllocate}
        disabled={!canAllocate}
        title="Click to allocate slot"
      />
    );
  }

  const levelBadge = boost && (boost.level || boost.isAttuned) ? (
    <span className="absolute -bottom-0.5 -right-0.5 min-w-[0.875rem] h-[0.875rem] flex items-center justify-center rounded-full bg-coh-dark border border-border/40 text-[0.5rem] font-bold text-white/90 leading-none z-10 px-0.5">
      {boost.isAttuned ? 'A' : boost.level}
    </span>
  ) : null;

  const slotButton = boost?.icon ? (
    <button
      className="relative w-[2.25rem] h-[2.25rem] flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
    >
      <img src={imageUrl(boost.icon)} alt={boost.computedName ?? ''} className="w-[2.25rem] h-[2.25rem]" />
      {levelBadge}
    </button>
  ) : (
    <button
      className="w-[2.25rem] h-[2.25rem] rounded-full flex items-center justify-center transition-colors cursor-pointer bg-coh-dark border-2 border-coh-gradient1/40 shadow-[inset_0_0.125rem_0.375rem_rgba(0,0,0,0.7)] hover:border-coh-gradient1/70 hover:shadow-[inset_0_0.125rem_0.375rem_rgba(0,0,0,0.7),0_0_0.375rem_rgba(59,130,246,0.2)]"
    />
  );

  const content = (
    <div className="relative group/slot">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {slotButton}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <EnhancementPicker
            powerFullName={powerFullName}
            slotIndex={slotIndex}
            onSelect={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      {canRemove && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive border border-destructive flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity z-10 hover:brightness-125"
          title="Remove slot"
        >
          <Minus className="h-2.5 w-2.5 text-white" />
        </button>
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
