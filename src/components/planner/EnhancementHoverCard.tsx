import { useState, useCallback } from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { useHeroStore } from '@/stores/heroStore';
import { imageUrl } from '@/lib/images';
import type { SlottedBoost, BoostSetDetail } from '@/types/models';

interface EnhancementHoverCardProps {
  boost: SlottedBoost;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function EnhancementHoverCard({ boost, children, side }: EnhancementHoverCardProps) {
  const [setDetail, setSetDetail] = useState<BoostSetDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchBoostSetDetail = useHeroStore((s) => s.fetchBoostSetDetail);

  const hasSet = !!boost.setName;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && hasSet && !setDetail) {
        setLoading(true);
        fetchBoostSetDetail(boost.setName!).then((d) => {
          setSetDetail(d);
          setLoading(false);
        });
      }
    },
    [hasSet, setDetail, fetchBoostSetDetail, boost.setName]
  );

  // For plain IOs (no set), just show a simple tooltip-like card
  if (!hasSet) {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>{children}</HoverCardTrigger>
        <HoverCardContent side={side} className="w-auto max-w-64 p-2 text-xs">
          <div className="flex items-center gap-2">
            {boost.icon && <img src={imageUrl(boost.icon)} alt="" className="w-5 h-5" />}
            <span>{boost.computedName ?? boost.boostKey}</span>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side={side} className="w-72 p-3 text-sm">
        {loading || !setDetail ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        ) : (
          <SetHoverContent boost={boost} detail={setDetail} />
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function SetHoverContent({ boost, detail }: { boost: SlottedBoost; detail: BoostSetDetail }) {
  return (
    <div>
      {/* Enhancement name */}
      <div className="flex items-center gap-2 mb-1">
        {boost.icon && <img src={imageUrl(boost.icon)} alt="" className="w-5 h-5" />}
        <span className="font-semibold text-xs">{boost.computedName ?? boost.boostKey}</span>
      </div>

      {/* Set header */}
      <div className="text-xs text-muted-foreground mb-2">
        {detail.display_name} (Lv {detail.min_level}-{detail.max_level})
      </div>

      {/* Set pieces */}
      <div className="border-t border-border pt-2 mb-2">
        <p className="text-[10px] font-medium text-muted-foreground mb-1">Set Enhancements</p>
        {detail.boosts.map((b) => (
          <div
            key={b.boost_key}
            className={`flex items-center gap-1.5 text-[11px] py-0.5 ${b.boost_key === boost.boostKey ? 'text-coh-info' : 'text-muted-foreground'}`}
          >
            {b.icon && <img src={imageUrl(b.icon)} alt="" className="w-3.5 h-3.5" />}
            <span>{b.computed_name ?? b.boost_key}</span>
            {b.is_proc && <span className="text-[9px] text-coh-info ml-auto">Proc</span>}
          </div>
        ))}
      </div>

      {/* Set bonuses */}
      {detail.bonuses.length > 0 && (
        <div className="border-t border-border pt-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-1">Set Bonuses</p>
          {detail.bonuses.map((bonus, i) => (
            <div key={i} className="text-[11px] text-muted-foreground py-0.5">
              <span className="text-coh-info">({bonus.min_boosts})</span>{' '}
              {bonus.display_texts.join(', ')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
