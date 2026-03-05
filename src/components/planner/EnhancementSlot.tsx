import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { imageUrl } from '@/lib/images';
import { EnhancementPicker } from './EnhancementPicker';
import { EnhancementHoverCard } from './EnhancementHoverCard';
import type { SlottedBoost } from '@/types/models';

interface EnhancementSlotProps {
  powerFullName: string;
  slotIndex: number;
  boost: SlottedBoost | null;
  isEmpty: boolean;
}

export function EnhancementSlot({ powerFullName, slotIndex, boost, isEmpty }: EnhancementSlotProps) {
  const [open, setOpen] = useState(false);

  if (isEmpty) {
    return (
      <div className="w-8 h-8 rounded-full border border-border/30 bg-transparent" />
    );
  }

  const slotButton = (
    <button
      className="w-8 h-8 rounded-full border border-coh-info/50 bg-coh-secondary/30 flex items-center justify-center text-xs text-muted-foreground hover:border-coh-info hover:bg-coh-secondary/50 transition-colors cursor-pointer"
    >
      {boost?.icon ? (
        <img src={imageUrl(boost.icon)} alt={boost.computedName ?? ''} className="w-7 h-7 rounded-full" />
      ) : (
        slotIndex + 1
      )}
    </button>
  );

  // When popover is open, don't show the hover card (they'd conflict)
  const trigger = boost && !open ? (
    <EnhancementHoverCard boost={boost} side="top">
      {slotButton}
    </EnhancementHoverCard>
  ) : (
    slotButton
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <EnhancementPicker
          powerFullName={powerFullName}
          slotIndex={slotIndex}
          onSelect={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
