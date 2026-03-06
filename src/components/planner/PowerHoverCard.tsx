import { useState, useCallback } from 'react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { useHeroStore } from '@/stores/heroStore';
import { api } from '@/lib/api';
import { imageUrl } from '@/lib/images';
import { condenseAttribs } from '@/lib/utils';
import type { PowerDetail, CalculatedEffect } from '@/types/models';

interface PowerHoverCardProps {
  powerFullName: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function PowerHoverCard({ powerFullName, children, side }: PowerHoverCardProps) {
  const [detail, setDetail] = useState<PowerDetail | null>(null);
  const [baseEffects, setBaseEffects] = useState<CalculatedEffect[] | null>(null);
  const [enhancedEffects, setEnhancedEffects] = useState<CalculatedEffect[] | null>(null);
  const [enhancedRecharge, setEnhancedRecharge] = useState<number | null>(null);
  const [enhancedEndurance, setEnhancedEndurance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchPowerDetail = useHeroStore((s) => s.fetchPowerDetail);

  const disabled = localStorage.getItem('heroplanner-hover') === 'false';
  if (disabled) return <>{children}</>;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !detail) {
        setLoading(true);
        fetchPowerDetail(powerFullName).then((d) => {
          setDetail(d);
          setLoading(false);

          // Fetch base and enhanced effects
          const state = useHeroStore.getState();
          if (!state.archetype) return;
          const atId = state.archetype.id;
          const level = state.powerNameToLevel[powerFullName];
          const selected = level !== undefined ? state.levelToPower[level] : null;
          const hasEnhancements = selected && Object.keys(selected.boosts).length > 0;

          api.calculatePowerEffects(atId, powerFullName, 49, []).then((r) => setBaseEffects(r.effects));

          if (hasEnhancements) {
            const enhs = Object.values(selected.boosts).map((b) => ({
              boostKey: b.boostKey,
              level: b.level,
              isAttuned: b.isAttuned,
              boostLevel: b.boostLevel,
            }));
            api.calculatePowerEffects(atId, powerFullName, 49, enhs).then((r) => {
              setEnhancedEffects(r.effects);
              setEnhancedRecharge(r.enhancedRecharge);
              setEnhancedEndurance(r.enhancedEndurance);
            });
          }
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
          <PowerHoverContent detail={detail} baseEffects={baseEffects} enhancedEffects={enhancedEffects} enhancedRecharge={enhancedRecharge} enhancedEndurance={enhancedEndurance} />
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

function PowerHoverContent({ detail, baseEffects, enhancedEffects, enhancedRecharge, enhancedEndurance }: { detail: PowerDetail; baseEffects: CalculatedEffect[] | null; enhancedEffects: CalculatedEffect[] | null; enhancedRecharge: number | null; enhancedEndurance: number | null }) {
  const stats: (StatRow & { enhanced?: string })[] = [];

  if (detail.boosts_allowed.includes('Enhance Accuracy') && detail.accuracy > 0) {
    stats.push({ icon: STAT_ICONS.Accuracy, label: 'Accuracy', value: `${detail.accuracy}x` });
  }
  if (detail.endurance_cost > 0) {
    const suffix = detail.power_type === 'Toggle' ? '/s' : '';
    stats.push({ icon: STAT_ICONS.Endurance, label: 'Endurance', value: `${detail.endurance_cost.toFixed(2)}${suffix}`, enhanced: enhancedEndurance != null ? `${enhancedEndurance.toFixed(2)}${suffix}` : undefined });
  }
  if (detail.recharge_time > 0) {
    stats.push({ icon: STAT_ICONS.Recharge, label: 'Recharge', value: `${detail.recharge_time.toFixed(2)}s`, enhanced: enhancedRecharge != null ? `${enhancedRecharge.toFixed(2)}s` : undefined });
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
          {stats.map(({ icon, label, value, enhanced }) => (
            <div key={label} className="contents">
              <img src={imageUrl(icon)} alt="" className="w-4 h-4" />
              <span className="text-muted-foreground">{label}</span>
              <span className="text-right">
                {value}
                {enhanced && <span className="text-emerald-400"> → {enhanced}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Calculated effects */}
      {baseEffects && baseEffects.length > 0 && (
        <>
          <div className="border-t border-border my-2" />
          <div className="space-y-0.5">
            {baseEffects.filter((e) => e.target === 'Self' || e.target === 'Affected').map((effect, i) => {
              const enhanced = enhancedEffects?.[i];
              const isEnhanced = enhanced && enhanced.display_value !== effect.display_value;
              const label = condenseAttribs(effect.attribs);
              return (
                <div key={i} className="text-[0.6875rem] flex items-center gap-1">
                  <span className="text-muted-foreground">{label}:</span>
                  <span>{effect.display_value}</span>
                  {isEnhanced && (
                    <span className="text-emerald-400">→ {enhanced.display_value}</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
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
