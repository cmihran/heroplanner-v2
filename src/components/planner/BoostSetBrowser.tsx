import { useState, useEffect } from 'react';
import { useHeroStore } from '@/stores/heroStore';
import { api } from '@/lib/api';
import { imageUrl } from '@/lib/images';
import { ChevronLeft } from 'lucide-react';
import type { BoostSetSummary, BoostSetDetail, EnhancementStrength } from '@/types/models';

interface BoostSetBrowserProps {
  allowedCategories: string[];
  powerFullName: string;
  slotIndex: number;
  onSelect: () => void;
  isInherent?: boolean;
}

type Level = 'categories' | 'sets' | 'boosts';

export function BoostSetBrowser({ allowedCategories, powerFullName, slotIndex, onSelect, isInherent }: BoostSetBrowserProps) {
  const setBoostInSlot = useHeroStore((s) => s.setBoostInSlot);
  const setInherentBoost = useHeroStore((s) => s.setInherentBoost);
  const archetype = useHeroStore((s) => s.archetype);

  const [level, setLevel] = useState<Level>('categories');
  const [boostSets, setBoostSets] = useState<BoostSetSummary[]>([]);
  const [selectedSet, setSelectedSet] = useState<BoostSetDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [boostStrengths, setBoostStrengths] = useState<Record<string, EnhancementStrength[]>>({});

  // Fetch enhancement % when a set is selected
  useEffect(() => {
    if (!selectedSet || !archetype) return;
    let cancelled = false;
    const fetch = async () => {
      const results: Record<string, EnhancementStrength[]> = {};
      for (const b of selectedSet.boosts) {
        try {
          const strengths = await api.getEnhancementValues(archetype.id, b.boost_key, 49, b.attuned);
          if (!cancelled) results[b.boost_key] = strengths;
        } catch { /* skip */ }
      }
      if (!cancelled) setBoostStrengths(results);
    };
    fetch();
    return () => { cancelled = true; };
  }, [selectedSet, archetype]);

  const handleCategoryClick = async (cat: string) => {
    setLoading(true);
    try {
      const sets = await api.listBoostSetsForCategory(cat);
      setBoostSets(sets);
      setLevel('sets');
    } finally {
      setLoading(false);
    }
  };

  const handleSetClick = async (setName: string) => {
    setLoading(true);
    try {
      const detail = await api.getBoostSetDetail(setName);
      setSelectedSet(detail);
      setLevel('boosts');
    } finally {
      setLoading(false);
    }
  };

  const handleBoostClick = (boostKey: string, icon: string | null, computedName: string | null, attuned: boolean) => {
    const groupName = selectedSet?.group_name ?? null;
    const isArchetype = groupName === 'Archetype';
    // Archetype and Very Rare (purple) sets are always attuned
    const forceAttuned = isArchetype || groupName === 'Very_Rare' || attuned;
    const level = forceAttuned ? null : (selectedSet?.max_level ?? 50);
    const boost = {
      boostKey,
      icon,
      computedName,
      setName: selectedSet?.name ?? null,
      setGroupName: groupName,
      level,
      isAttuned: forceAttuned,
      boostLevel: 0,
    };
    if (isInherent) {
      setInherentBoost(powerFullName, slotIndex, boost);
    } else {
      setBoostInSlot(powerFullName, slotIndex, boost);
    }
    onSelect();
  };

  const handleBack = () => {
    if (level === 'boosts') {
      setSelectedSet(null);
      setLevel('sets');
    } else if (level === 'sets') {
      setBoostSets([]);
      setLevel('categories');
    }
  };

  if (allowedCategories.length === 0) {
    return <p className="p-3 text-xs text-muted-foreground italic">No set categories available for this power.</p>;
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      {level !== 'categories' && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-coh-info hover:text-coh-info/80 w-full border-b border-border/30"
        >
          <ChevronLeft className="h-3 w-3" />
          Back
        </button>
      )}

      {loading && (
        <p className="p-3 text-xs text-muted-foreground">Loading...</p>
      )}

      {!loading && level === 'categories' && (
        <div className="flex flex-col">
          {allowedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className="px-3 py-2 text-xs text-left hover:bg-coh-secondary/30 transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {!loading && level === 'sets' && (
        <div className="flex flex-col">
          {boostSets.map((bs) => (
            <button
              key={bs.name}
              onClick={() => handleSetClick(bs.name)}
              className="px-3 py-2 text-xs text-left hover:bg-coh-secondary/30 transition-colors flex items-center gap-2"
            >
              {bs.icon && <img src={imageUrl(bs.icon)} alt="" className="w-5 h-5 shrink-0" />}
              <span className="flex-1">{bs.display_name}</span>
              <span className="text-muted-foreground shrink-0">Lv {bs.min_level}-{bs.max_level}</span>
            </button>
          ))}
          {boostSets.length === 0 && (
            <p className="p-3 text-xs text-muted-foreground italic">No sets in this category.</p>
          )}
        </div>
      )}

      {!loading && level === 'boosts' && selectedSet && (
        <div className="flex flex-col">
          <div className="px-3 py-2 border-b border-border/30">
            <p className="text-xs font-medium">{selectedSet.display_name}</p>
            <p className="text-[0.625rem] text-muted-foreground">Lv {selectedSet.min_level}-{selectedSet.max_level}</p>
          </div>
          {selectedSet.boosts.map((b) => {
            const strengths = boostStrengths[b.boost_key];
            const pctLabel = strengths?.length
              ? strengths.map((s) => s.displayStrength).join(', ')
              : null;
            return (
              <button
                key={b.boost_key}
                onClick={() => handleBoostClick(b.boost_key, b.icon, b.computed_name, b.attuned)}
                className="px-3 py-2 text-xs text-left hover:bg-coh-secondary/30 transition-colors flex items-center gap-2"
              >
                {b.icon && <img src={imageUrl(b.icon)} alt="" className="w-4 h-4" />}
                <span className="flex-1">{b.computed_name ?? b.boost_key}</span>
                {pctLabel && !b.is_proc && (
                  <span className="text-coh-info/70 text-[0.625rem] shrink-0">{pctLabel}</span>
                )}
                {b.is_proc && <span className="text-[0.625rem] text-coh-info shrink-0">Proc</span>}
              </button>
            );
          })}
          {selectedSet.bonuses.length > 0 && (
            <div className="px-3 py-2 border-t border-border/30">
              <p className="text-[0.625rem] font-medium text-muted-foreground mb-1">Set Bonuses</p>
              {selectedSet.bonuses.map((bonus, i) => (
                <p key={i} className="text-[0.625rem] text-muted-foreground">
                  ({bonus.min_boosts}+) {bonus.display_texts.join(', ')}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
