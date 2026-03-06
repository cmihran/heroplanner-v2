import { useState, useCallback, useRef, type DragEvent, type MouseEvent } from 'react';
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
  const [slotDragging, setSlotDragging] = useState(false);

  // Drag-to-add/remove enhancement slots
  const slotDragRef = useRef<{
    startX: number;
    startSlots: number;
    lastThresholdSlots: number;
  } | null>(null);

  const handleSlotDragMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    // Only left mouse button
    if (e.button !== 0) return;
    if (!selectedPower) return;

    const { numSlots } = selectedPower;
    const startX = e.clientX;
    let activated = false;

    slotDragRef.current = {
      startX,
      startSlots: numSlots,
      lastThresholdSlots: numSlots,
    };

    const SLOT_WIDTH_PX = 44; // ~2.75rem at 16px base, approximate threshold
    const DRAG_THRESHOLD = 8;  // px before we consider it a drag (not a click)

    const handleMouseMove = (ev: globalThis.MouseEvent) => {
      const ref = slotDragRef.current;
      if (!ref || !selectedPower) return;

      const deltaX = ev.clientX - ref.startX;

      // Don't activate until the mouse has moved enough to distinguish from a click
      if (!activated) {
        if (Math.abs(deltaX) < DRAG_THRESHOLD) return;
        activated = true;
        setSlotDragging(true);
      }

      // Compute how many slots to change based on distance from start
      const slotDelta = Math.round(deltaX / SLOT_WIDTH_PX);
      const targetSlots = ref.startSlots + slotDelta;

      // Clamp: at least 1, at most max_boosts
      const clampedTarget = Math.max(1, Math.min(selectedPower.power.max_boosts, targetSlots));

      if (clampedTarget !== ref.lastThresholdSlots) {
        if (clampedTarget > ref.lastThresholdSlots) {
          // Adding slots
          const toAdd = clampedTarget - ref.lastThresholdSlots;
          for (let i = 0; i < toAdd; i++) {
            if (canAddMore()) {
              addSlot(selectedPower.power.full_name);
            }
          }
        } else {
          // Removing slots
          const toRemove = ref.lastThresholdSlots - clampedTarget;
          for (let i = 0; i < toRemove; i++) {
            // Remove from end; current numSlots may have changed
            const currentSlots = ref.lastThresholdSlots - i;
            if (currentSlots > 1) {
              removeSlotAt(selectedPower.power.full_name, currentSlots - 1);
            }
          }
        }
        ref.lastThresholdSlots = clampedTarget;
      }
    };

    const handleMouseUp = () => {
      slotDragRef.current = null;
      setSlotDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [selectedPower, addSlot, removeSlotAt, canAddMore]);

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
      <div className="ml-4" {...dragProps}>
        <div className={`rounded-full border bg-gradient-to-r from-coh-dark/60 to-coh-dark/30 pl-5 pr-4 flex items-center transition-colors min-h-[3.5rem] ${dragOver ? 'border-coh-gradient1/50 bg-coh-gradient1/5' : 'border-coh-secondary/20'}`}>
          <div>
            <p className="text-sm text-muted-foreground/50">Level {level}</p>
            <p className="text-[0.625rem] leading-tight text-muted-foreground/30">Empty slot</p>
          </div>
        </div>
      </div>
    );
  }

  const { power, numSlots, isActive } = selectedPower;
  const showToggle = power.has_self_effects;

  const hasSlots = power.max_boosts > 0;

  return (
    <div
      className={`group transition-colors ${!isActive && showToggle ? 'opacity-50 saturate-50' : ''}`}
      {...dragProps}
    >
      {/* Power info bar — pill shape with protruding icon, draggable for reordering */}
      <div
        className="relative ml-4"
        draggable
        onDragStart={handleDragStart}
      >
        {/* Pill bar */}
        <div className={`rounded-full border bg-gradient-to-r from-coh-gradient2/90 via-coh-gradient2/60 to-coh-gradient2/40 shadow-[0_0.125rem_0.25rem_rgba(0,0,0,0.3)] ${dragOver ? 'border-coh-gradient1/60 shadow-[0_0_0.5rem_rgba(53,123,215,0.2)]' : 'border-coh-secondary/50'}`}>
          <div className="flex items-center gap-2 pl-8 pr-3 pt-1 pb-2 bg-gradient-to-b from-white/10 via-transparent to-black/30 rounded-full">
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
                className={`ml-auto w-5 h-5 rounded-full shrink-0 border flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-green-600 border-green-400 shadow-[0_0_0.375rem_rgba(34,197,94,0.4),inset_0_0.0625rem_0_rgba(255,255,255,0.2)]'
                    : 'bg-coh-dark/60 border-coh-secondary/40 shadow-[inset_0_0.0625rem_0.125rem_rgba(0,0,0,0.3)]'
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
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full cursor-grab ring-2 ring-coh-gradient1/40 shadow-[0_0_0.5rem_rgba(0,0,0,0.6),0_0_0.75rem_rgba(53,123,215,0.15)]"
        />
      </div>

      {/* Enhancement slots — overlapping bottom of pill */}
      {hasSlots && (
        <div
          className={`flex items-center gap-1 ml-4 pl-7 -mt-2 relative z-10 pr-2 py-0.5 ${slotDragging ? 'cursor-ew-resize' : 'cursor-default'}`}
          onMouseDown={handleSlotDragMouseDown}
        >
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
          {/* Ghost add button — visible on hover or during slot drag */}
          {numSlots < power.max_boosts && canAddMore() && (
            <button
              onClick={() => addSlot(power.full_name)}
              className={`w-[2.5rem] h-[2.5rem] rounded-full border-2 border-dashed flex items-center justify-center transition-opacity hover:border-coh-info/60 hover:bg-coh-secondary/20 ${
                slotDragging
                  ? 'opacity-100 border-coh-info/50 bg-coh-info/10 animate-pulse'
                  : 'border-coh-info/30 opacity-0 group-hover:opacity-100'
              }`}
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
