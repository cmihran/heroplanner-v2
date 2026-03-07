import { useEffect, useState } from 'react';
import { useHeroStore } from '@/stores/heroStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { imageUrl } from '@/lib/images';
import { Plus, Check } from 'lucide-react';
import { EnhancementSlot } from './EnhancementSlot';
import type { InherentPowerInfo, InherentPowersResult, InherentSlotView } from '@/types/models';

const EMPTY_OBJ: Record<string, InherentSlotView> = {};

function InherentPowerCard({ power, highlight }: { power: InherentPowerInfo; highlight?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg p-3 transition-colors cursor-pointer ${
        highlight
          ? 'bg-coh-secondary/60 border border-coh-gradient1/40'
          : 'bg-white/5 hover:bg-white/8'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3">
        <img
          src={imageUrl(power.icon)}
          alt=""
          className="w-[2rem] h-[2rem] rounded flex-shrink-0"
          draggable={false}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {power.displayName}
            </span>
            <span className="text-[0.625rem] text-muted-foreground">
              {power.powerType}
            </span>
          </div>
          {power.displayShortHelp && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {power.displayShortHelp}
            </p>
          )}
        </div>
      </div>
      {expanded && power.displayHelp && (
        <p
          className="text-xs text-coh-info mt-2 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: power.displayHelp.replace(/<br\s*\/?>/gi, '<br />'),
          }}
        />
      )}
    </div>
  );
}

function SlottableInherentCard({ power }: { power: InherentPowerInfo }) {
  const [expanded, setExpanded] = useState(false);
  const inherentSlots = useHeroStore((s) => s.buildView?.inherentSlots) ?? EMPTY_OBJ;
  const addInherentSlot = useHeroStore((s) => s.addInherentSlot);
  const removeInherentSlotAt = useHeroStore((s) => s.removeInherentSlotAt);
  const toggleInherentActive = useHeroStore((s) => s.toggleInherentActive);
  const canAddMore = useHeroStore((s) => s.canAddMoreSlots);

  const slot = inherentSlots[power.fullName] ?? { numSlots: 0, boosts: {}, isActive: true };
  const showToggle = power.hasSelfEffects;

  return (
    <div className={`rounded-lg p-3 bg-white/5 hover:bg-white/8 transition-colors ${!slot.isActive && showToggle ? 'opacity-50 saturate-50' : ''}`}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <img
          src={imageUrl(power.icon)}
          alt=""
          className="w-[2rem] h-[2rem] rounded flex-shrink-0"
          draggable={false}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {power.displayName}
            </span>
            <span className="text-[0.625rem] text-muted-foreground">
              {power.powerType}
            </span>
          </div>
          {power.displayShortHelp && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {power.displayShortHelp}
            </p>
          )}
        </div>
        {showToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleInherentActive(power.fullName); }}
            className={`w-5 h-5 rounded-full shrink-0 border flex items-center justify-center transition-all duration-200 ${
              slot.isActive
                ? 'bg-green-600 border-green-400 shadow-[0_0_0.375rem_rgba(34,197,94,0.4)]'
                : 'bg-coh-dark/60 border-coh-secondary/40'
            }`}
            title={slot.isActive ? 'Active' : 'Inactive'}
          >
            {slot.isActive && <Check className="h-3 w-3 text-white" />}
          </button>
        )}
      </div>

      {/* Enhancement slots */}
      {power.maxBoosts > 0 && (
        <div className="flex items-center gap-1 mt-2 ml-1">
          {Array.from({ length: slot.numSlots }, (_, i) => (
            <EnhancementSlot
              key={i}
              powerFullName={power.fullName}
              slotIndex={i}
              boost={slot.boosts[i] || null}
              isEmpty={false}
              onRemove={() => removeInherentSlotAt(power.fullName, i)}
              canRemove={slot.numSlots > 0}
              isInherent
            />
          ))}
          {slot.numSlots < power.maxBoosts && canAddMore() && (
            <button
              onClick={() => addInherentSlot(power.fullName)}
              className="w-[2.5rem] h-[2.5rem] rounded-full border-2 border-dashed border-coh-info/30 flex items-center justify-center hover:border-coh-info/60 hover:bg-coh-secondary/20 transition-colors"
              title="Add enhancement slot"
            >
              <Plus className="h-3.5 w-3.5 text-coh-info/50" />
            </button>
          )}
        </div>
      )}

      {expanded && power.displayHelp && (
        <p
          className="text-xs text-coh-info mt-2 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: power.displayHelp.replace(/<br\s*\/?>/gi, '<br />'),
          }}
        />
      )}
    </div>
  );
}

export function InherentsTab() {
  const archetype = useHeroStore((s) => s.archetype);
  const [inherentData, setInherentData] = useState<InherentPowersResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!archetype) {
      setInherentData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api.getInherentPowers(archetype.name).then((result) => {
      if (!cancelled) {
        setInherentData(result);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [archetype?.name]);

  if (!archetype) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select an archetype to view inherent powers
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (!inherentData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No inherent data available
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* AT-Specific Inherent */}
        {inherentData.atInherent && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <img
                src={imageUrl(archetype.icon)}
                alt=""
                className="w-[1rem] h-[1rem]"
                draggable={false}
              />
              {archetype.display_name} Inherent
            </h3>
            <InherentPowerCard power={inherentData.atInherent} highlight />
          </div>
        )}

        {/* Core Inherent Powers */}
        {inherentData.corePowers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Core Powers
            </h3>
            <div className="space-y-1.5">
              {inherentData.corePowers.map((power) => (
                <InherentPowerCard key={power.fullName} power={power} />
              ))}
            </div>
          </div>
        )}

        {/* Inherent Fitness — slottable */}
        {inherentData.fitnessPowers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Inherent Fitness
            </h3>
            <div className="space-y-1.5">
              {inherentData.fitnessPowers.map((power) => (
                <SlottableInherentCard key={power.fullName} power={power} />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
