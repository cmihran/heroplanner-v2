import { useEffect, useState } from 'react';
import { useHeroStore } from '@/stores/heroStore';
import { api } from '@/lib/api';
import { imageUrl } from '@/lib/images';
import { condenseAttribs } from '@/lib/utils';
import { Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react';
import type { PowerDetail, CalculatedEffect, BoostSetDetail, EnhancementStrength } from '@/types/models';

function PowerDetailContent({ powerFullName }: { powerFullName: string }) {
  const archetype = useHeroStore((s) => s.archetype);
  const fetchPowerDetail = useHeroStore((s) => s.fetchPowerDetail);
  const buildView = useHeroStore((s) => s.buildView);

  const [detail, setDetail] = useState<PowerDetail | null>(null);
  const [baseEffects, setBaseEffects] = useState<CalculatedEffect[]>([]);
  const [enhancedEffects, setEnhancedEffects] = useState<CalculatedEffect[] | null>(null);
  const [enhancedRecharge, setEnhancedRecharge] = useState<number | null>(null);
  const [enhancedEndurance, setEnhancedEndurance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPowerDetail(powerFullName).then((d) => {
      if (!cancelled) {
        setDetail(d);
        if (archetype) {
          api.calculatePowerEffects(archetype.id, powerFullName, 49, []).then((result) => {
            if (!cancelled) setBaseEffects(result.effects);
          });

          const bv = useHeroStore.getState().buildView;
          const pv = bv?.powers.find((p) => p.powerFullName === powerFullName);
          if (pv && Object.keys(pv.boosts).length > 0) {
            const enhs = Object.values(pv.boosts).map((b) => ({
              boostKey: b.boostKey,
              level: b.level,
              isAttuned: b.isAttuned,
              boostLevel: b.boostLevel,
            }));
            api.calculatePowerEffects(archetype.id, powerFullName, 49, enhs).then((result) => {
              if (!cancelled) {
                setEnhancedEffects(result.effects);
                setEnhancedRecharge(result.enhancedRecharge);
                setEnhancedEndurance(result.enhancedEndurance);
              }
            });
          }
        }
      }
    });
    return () => { cancelled = true; };
  }, [powerFullName, archetype, fetchPowerDetail]);

  if (!detail) return <div className="p-3 text-xs text-muted-foreground">Loading...</div>;

  const selected = buildView?.powers.find((p) => p.powerFullName === powerFullName) ?? null;
  const level = selected?.level;

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <img src={imageUrl(detail.icon)} alt="" className="w-8 h-8" draggable={false} />
        <div>
          <div className="font-semibold text-sm">{detail.display_name}</div>
          <div className="text-[0.625rem] text-muted-foreground">
            {detail.power_type}
            {detail.effect_area ? ` · ${detail.effect_area}` : ''}
            {selected ? ` · Level ${level}` : ''}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        {detail.accuracy > 0 && <div><span className="text-muted-foreground">Accuracy:</span> {detail.accuracy}x</div>}
        {detail.endurance_cost > 0 && <div>
          <span className="text-muted-foreground">End:</span> {detail.endurance_cost.toFixed(2)}{detail.power_type === 'Toggle' ? '/s' : ''}
          {enhancedEndurance != null && <span className="text-emerald-400"> → {enhancedEndurance.toFixed(2)}{detail.power_type === 'Toggle' ? '/s' : ''}</span>}
        </div>}
        {detail.recharge_time > 0 && <div>
          <span className="text-muted-foreground">Recharge:</span> {detail.recharge_time.toFixed(2)}s
          {enhancedRecharge != null && <span className="text-emerald-400"> → {enhancedRecharge.toFixed(2)}s</span>}
        </div>}
        {detail.activation_time > 0 && <div><span className="text-muted-foreground">Cast:</span> {detail.activation_time.toFixed(2)}s</div>}
        {detail.range > 0 && <div><span className="text-muted-foreground">Range:</span> {detail.range}ft</div>}
        {detail.radius > 0 && <div><span className="text-muted-foreground">Radius:</span> {detail.radius}ft</div>}
      </div>

      {/* Effects */}
      {baseEffects.length > 0 && (
        <div className="border-t border-border pt-2 space-y-0.5">
          <p className="text-[0.625rem] font-medium text-muted-foreground mb-1">Effects</p>
          {baseEffects.filter((e) => e.target === 'Self' || e.target === 'Affected').map((effect, i) => {
            const enhanced = enhancedEffects?.[i];
            const isEnhanced = enhanced && enhanced.display_value !== effect.display_value;
            return (
              <div key={i} className="text-[0.6875rem] flex items-center gap-1">
                <span className="text-muted-foreground">{condenseAttribs(effect.attribs)}:</span>
                <span>{effect.display_value}</span>
                {isEnhanced && <span className="text-emerald-400">→ {enhanced.display_value}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Description */}
      {detail.display_help && (
        <div className="border-t border-border pt-2">
          <div
            className="text-xs text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: detail.display_help }}
          />
        </div>
      )}
    </div>
  );
}

function EnhancementDetailContent({ boostKey, powerName }: { boostKey: string; powerName?: string }) {
  const archetype = useHeroStore((s) => s.archetype);
  const fetchBoostSetDetail = useHeroStore((s) => s.fetchBoostSetDetail);
  const buildView = useHeroStore((s) => s.buildView);

  const [strengths, setStrengths] = useState<EnhancementStrength[]>([]);
  const [setDetail, setSetDetail] = useState<BoostSetDetail | null>(null);

  // Find the boost in slotted data to get setName, icon etc
  let boostSetName: string | null = null;
  let boostIcon: string | null = null;
  let boostName: string | null = null;
  let boostIsAttuned = false;
  let boostEffectiveLevel = 49;
  if (powerName && buildView) {
    // Check regular powers first, then inherent slots
    const pv = buildView.powers.find((p) => p.powerFullName === powerName);
    const boosts: Record<number, import('@/types/models').BoostView> | undefined = pv?.boosts ?? buildView.inherentSlots[powerName]?.boosts;
    if (boosts) {
      const boost = Object.values(boosts).find((b) => b.boostKey === boostKey);
      if (boost) {
        boostSetName = boost.setName;
        boostIcon = boost.icon;
        boostName = boost.computedName;
        boostIsAttuned = boost.isAttuned;
        const baseLevel = boost.level ?? 50;
        boostEffectiveLevel = Math.min(53, baseLevel + (boost.boostLevel ?? 0)) - 1;
      }
    }
  }

  useEffect(() => {
    if (!archetype) return;
    let cancelled = false;
    api.getEnhancementValues(archetype.id, boostKey, boostEffectiveLevel, boostIsAttuned).then((s) => {
      if (!cancelled) setStrengths(s);
    });
    if (boostSetName) {
      fetchBoostSetDetail(boostSetName).then((d) => {
        if (!cancelled) setSetDetail(d);
      });
    }
    return () => { cancelled = true; };
  }, [boostKey, archetype, boostSetName, boostEffectiveLevel, boostIsAttuned, fetchBoostSetDetail]);

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        {boostIcon && <img src={imageUrl(boostIcon)} alt="" className="w-6 h-6" draggable={false} />}
        <span className="font-semibold text-sm">{boostName ?? boostKey}</span>
      </div>

      {strengths.length > 0 && (
        <div className="space-y-0.5">
          {strengths.map((s, i) => (
            <div key={i} className="text-xs">
              <span className="text-muted-foreground">{s.displayAttrib}:</span>{' '}
              <span className="text-coh-info">{s.displayStrength}</span>
            </div>
          ))}
        </div>
      )}

      {setDetail && (
        <>
          <div className="border-t border-border pt-2">
            <p className="text-[0.625rem] font-medium text-muted-foreground mb-1">
              {setDetail.display_name} (Lv {setDetail.min_level}-{setDetail.max_level})
            </p>
            {setDetail.boosts.map((b) => (
              <div
                key={b.boost_key}
                className={`flex items-center gap-1.5 text-[0.6875rem] py-0.5 ${b.boost_key === boostKey ? 'text-coh-info' : 'text-muted-foreground'}`}
              >
                {b.icon && <img src={imageUrl(b.icon)} alt="" className="w-3.5 h-3.5" draggable={false} />}
                <span>{b.computed_name ?? b.boost_key}</span>
              </div>
            ))}
          </div>
          {setDetail.bonuses.length > 0 && (
            <div className="border-t border-border pt-2">
              <p className="text-[0.625rem] font-medium text-muted-foreground mb-1">Set Bonuses</p>
              {setDetail.bonuses.map((bonus, i) => (
                <div key={i} className="text-[0.6875rem] text-muted-foreground py-0.5">
                  <span className="text-coh-info">({bonus.min_boosts})</span>{' '}
                  {bonus.display_texts.join(', ')}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function DetailPane() {
  const target = useHeroStore((s) => s.detailPaneTarget);
  const locked = useHeroStore((s) => s.detailPaneLocked);
  const minimized = useHeroStore((s) => s.detailPaneMinimized);
  const toggleLock = useHeroStore((s) => s.toggleDetailPaneLock);
  const toggleMinimized = useHeroStore((s) => s.toggleDetailPaneMinimized);

  return (
    <div className={`flex flex-col bg-coh-dark/30 border-t border-coh-secondary/30 ${minimized ? '' : 'h-full'}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-coh-secondary/20 bg-coh-dark/40 shrink-0">
        <span className="text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider">
          {target ? (target.type === 'power' ? 'Power Details' : 'Enhancement Details') : 'Details'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleLock}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${locked ? 'text-coh-gradient4' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}
            title={locked ? 'Locked — click to unlock' : 'Unlocked — click to lock'}
          >
            {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
          <button
            onClick={toggleMinimized}
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            title={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {!minimized && (
        <div className="flex-1 overflow-y-auto min-h-0">
          {!target ? (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground/50">
              Hover over a power or enhancement to see details
            </div>
          ) : target.type === 'power' ? (
            <PowerDetailContent powerFullName={target.key} />
          ) : (
            <EnhancementDetailContent boostKey={target.key} powerName={target.powerName} />
          )}
        </div>
      )}
    </div>
  );
}
