import { useHeroStore } from '@/stores/heroStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { imageUrl } from '@/lib/images';
import type { ActiveSetBonus } from '@/types/models';

function groupByPower(bonuses: ActiveSetBonus[]): Record<string, ActiveSetBonus[]> {
  const groups: Record<string, ActiveSetBonus[]> = {};
  for (const bonus of bonuses) {
    if (!groups[bonus.powerFullName]) groups[bonus.powerFullName] = [];
    groups[bonus.powerFullName].push(bonus);
  }
  return groups;
}

export function SetBonusesTab() {
  const buildView = useHeroStore((s) => s.buildView);

  const activeBonuses = buildView?.stats?.activeBonuses ?? [];

  if (activeBonuses.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No active set bonuses
      </div>
    );
  }

  // Count unique sets
  const uniqueSets = new Set(activeBonuses.map((b) => b.setName + '|' + b.powerFullName));
  const grouped = groupByPower(activeBonuses);

  // Build power display name map
  const powerDisplayNames: Record<string, string> = {};
  for (const pv of buildView?.powers ?? []) {
    powerDisplayNames[pv.powerFullName] = pv.displayName;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <div className="text-xs text-muted-foreground">
          {activeBonuses.length} active bonus{activeBonuses.length !== 1 ? 'es' : ''} from {uniqueSets.size} set{uniqueSets.size !== 1 ? 's' : ''}
        </div>

        {Object.entries(grouped).map(([powerFullName, bonuses]) => (
          <div key={powerFullName} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {powerDisplayNames[powerFullName] || powerFullName.split('.').pop()}
            </h3>
            {bonuses.map((bonus, i) => (
              <div key={`${bonus.setName}-${bonus.minBoosts}-${i}`} className="bg-white/5 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  {bonus.setIcon && (
                    <img src={imageUrl(bonus.setIcon)} alt="" className="w-4 h-4" />
                  )}
                  <span className="text-xs font-medium text-foreground">
                    {bonus.setDisplayName}
                  </span>
                  <span className="text-[0.625rem] text-muted-foreground ml-auto">
                    {bonus.slottedCount} pieces ({bonus.minBoosts} needed)
                  </span>
                </div>
                <div className="space-y-0.5 pl-6">
                  {bonus.displayTexts.map((text, j) => (
                    <div key={j} className="text-xs text-green-400">
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
