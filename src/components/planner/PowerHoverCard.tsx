import { useState, useCallback } from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { useHeroStore } from '@/stores/heroStore';
import { imageUrl } from '@/lib/images';
import type { PowerDetail } from '@/types/models';

interface PowerHoverCardProps {
  powerFullName: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function PowerHoverCard({ powerFullName, children, side }: PowerHoverCardProps) {
  const [detail, setDetail] = useState<PowerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchPowerDetail = useHeroStore((s) => s.fetchPowerDetail);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !detail) {
        setLoading(true);
        fetchPowerDetail(powerFullName).then((d) => {
          setDetail(d);
          setLoading(false);
        });
      }
    },
    [detail, fetchPowerDetail, powerFullName]
  );

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side={side} className="w-80 p-3 text-sm">
        {loading || !detail ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        ) : (
          <PowerHoverContent detail={detail} />
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

interface StatRow {
  icon: string;
  label: string;
  value: string;
}

const STAT_ICONS: Record<string, string> = {
  Accuracy: 'TO_Training_Accuracy.png',
  Endurance: 'TO_Training_Endurance_Cost.png',
  Recharge: 'TO_Training_Attack_Rate.png',
  'Cast Time': 'TO_Training_Interrupt_Time.png',
  Range: 'TO_Training_Range.png',
  Radius: 'TO_Training_Range.png',
  Arc: 'TO_Training_Range.png',
  Damage: 'TO_Training_Damage.png',
};

function PowerHoverContent({ detail }: { detail: PowerDetail }) {
  const stats: StatRow[] = [];

  if (detail.boosts_allowed.includes('Enhance Accuracy') && detail.accuracy > 0) {
    stats.push({ icon: STAT_ICONS.Accuracy, label: 'Accuracy', value: `${detail.accuracy}x` });
  }
  if (detail.endurance_cost > 0) {
    const suffix = detail.power_type === 'Toggle' ? '/s' : '';
    stats.push({ icon: STAT_ICONS.Endurance, label: 'Endurance', value: `${detail.endurance_cost.toFixed(2)}${suffix}` });
  }
  if (detail.recharge_time > 0) {
    stats.push({ icon: STAT_ICONS.Recharge, label: 'Recharge', value: `${detail.recharge_time.toFixed(2)}s` });
  }
  if (detail.activation_time > 0) {
    stats.push({ icon: STAT_ICONS['Cast Time'], label: 'Cast Time', value: `${detail.activation_time.toFixed(2)}s` });
  }
  if (detail.range > 0) {
    stats.push({ icon: STAT_ICONS.Range, label: 'Range', value: `${detail.range}ft` });
  }
  if (detail.radius > 0) {
    stats.push({ icon: STAT_ICONS.Radius, label: 'Radius', value: `${detail.radius}ft` });
  }
  if (detail.arc > 0) {
    stats.push({ icon: STAT_ICONS.Arc, label: 'Arc', value: `${Math.round(detail.arc * 180 / Math.PI)}°` });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <img src={imageUrl(detail.icon)} alt="" className="w-6 h-6" />
        <span className="font-semibold">{detail.display_name}</span>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {detail.power_type}
        {detail.effect_area ? ` · ${detail.effect_area}` : ''}
      </div>

      {/* Stats grid */}
      {stats.length > 0 && (
        <div className="grid grid-cols-[auto_auto_1fr] gap-x-2 gap-y-1 text-xs mb-2 items-center">
          {stats.map(({ icon, label, value }) => (
            <div key={label} className="contents">
              <img src={imageUrl(icon)} alt="" className="w-4 h-4" />
              <span className="text-muted-foreground">{label}</span>
              <span className="text-right">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      {detail.display_help && (
        <>
          <div className="border-t border-border my-2" />
          <div
            className="text-xs text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: detail.display_help }}
          />
        </>
      )}
    </div>
  );
}
