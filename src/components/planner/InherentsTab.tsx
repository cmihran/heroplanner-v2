import { useEffect, useState } from 'react';
import { useHeroStore } from '@/stores/heroStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { imageUrl } from '@/lib/images';
import type { InherentPowerInfo, InherentPowersResult } from '@/types/models';

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

        {/* Inherent Fitness */}
        {inherentData.fitnessPowers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Inherent Fitness
            </h3>
            <div className="space-y-1.5">
              {inherentData.fitnessPowers.map((power) => (
                <InherentPowerCard key={power.fullName} power={power} />
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
