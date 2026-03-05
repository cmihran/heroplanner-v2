import { useHeroStore } from '@/stores/heroStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { imageUrl } from '@/lib/images';
import type { PowersetCategory, PowerSummary } from '@/types/models';
import { cn } from '@/lib/utils';

interface PowerSetSelectorProps {
  label: string;
  choices: PowersetCategory[];
  powers: PowerSummary[];
  slot: 'primary' | 'secondary' | 'pool1' | 'pool2' | 'pool3' | 'pool4';
}

export function PowerSetSelector({ label, choices, powers, slot }: PowerSetSelectorProps) {
  const selectPowerset = useHeroStore((s) => s.selectPowerset);
  const togglePower = useHeroStore((s) => s.togglePower);
  const powerNameToLevel = useHeroStore((s) => s.powerNameToLevel);

  return (
    <div className="mb-3">
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Select
        onValueChange={(name) => {
          const ps = choices.find((c) => c.powerset_name === name);
          if (ps) selectPowerset(slot, ps);
        }}
      >
        <SelectTrigger className="mb-1">
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {choices.map((c) => (
            <SelectItem key={c.powerset_name} value={c.powerset_name}>
              {c.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {powers.length > 0 && (
        <ScrollArea className="h-48 rounded border border-border">
          <div className="p-1">
            {powers.map((power) => {
              const isSelected = power.full_name in powerNameToLevel;
              return (
                <button
                  key={power.full_name}
                  onClick={() => togglePower(power)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors hover:bg-coh-secondary/50',
                    isSelected && 'bg-coh-gradient2 text-white'
                  )}
                >
                  <img src={imageUrl(power.icon)} alt="" className="w-5 h-5 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate">{power.display_name}</div>
                    {power.display_short_help && (
                      <div className="text-xs text-muted-foreground truncate">
                        {power.display_short_help}
                      </div>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    Lv{power.available_level}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
