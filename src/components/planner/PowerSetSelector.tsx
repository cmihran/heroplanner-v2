import { useHeroStore } from '@/stores/heroStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { imageUrl } from '@/lib/images';
import { X } from 'lucide-react';
import type { PowersetCategory, PowerSummary } from '@/types/models';
import { cn } from '@/lib/utils';
import { PowerHoverCard } from './PowerHoverCard';

interface PowerSetSelectorProps {
  label: string;
  choices: PowersetCategory[];
  powers: PowerSummary[];
  slot: 'primary' | 'secondary' | 'pool1' | 'pool2' | 'pool3' | 'pool4';
  selectedValue: string | null;
}

export function PowerSetSelector({ label, choices, powers, slot, selectedValue }: PowerSetSelectorProps) {
  const selectPowerset = useHeroStore((s) => s.selectPowerset);
  const clearPowerset = useHeroStore((s) => s.clearPowerset);
  const togglePower = useHeroStore((s) => s.togglePower);
  const powerNameToLevel = useHeroStore((s) => s.powerNameToLevel);

  return (
    <div className="mb-3">
      <label className="text-[0.6875rem] font-medium text-coh-gradient4/70 mb-1 block uppercase tracking-wider">
        {label}
      </label>
      <div className="relative flex items-center gap-1">
        <Select
          value={selectedValue ?? ''}
          onValueChange={(name) => {
            const ps = choices.find((c) => c.powerset_name === name);
            if (ps) selectPowerset(slot, ps);
          }}
        >
          <SelectTrigger className="mb-1 relative z-20 pr-3 bg-coh-dark/80 border-coh-secondary/60 hover:border-coh-gradient1/60 hover:shadow-[0_0_0.375rem_rgba(53,123,215,0.15)] transition-all duration-200">
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {choices.map((c) => (
              <SelectItem key={c.powerset_name} value={c.powerset_name}>
                {c.icon && (
                  <img src={imageUrl(c.icon)} alt="" className="w-4 h-4 inline-block mr-1.5 -mt-0.5" draggable={false} />
                )}
                {c.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedValue && (
          <button
            onClick={() => clearPowerset(slot)}
            className="mb-1 h-6 w-6 flex items-center justify-center rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors shrink-0"
            title="Clear power set"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {powers.length > 0 && (
        <ScrollArea className="h-48 rounded-md border border-coh-secondary/40 bg-coh-dark/40 shadow-[inset_0_0.25rem_0.375rem_rgba(0,0,0,0.3),inset_0_-0.25rem_0.375rem_rgba(0,0,0,0.15)]">
          <div className="p-1">
            {powers.map((power) => {
              const isSelected = power.full_name in powerNameToLevel;
              return (
                <button
                  key={power.full_name}
                  onClick={() => togglePower(power)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-all duration-150',
                    isSelected
                      ? 'bg-gradient-to-r from-coh-gradient1/30 via-coh-gradient2/50 to-coh-gradient2/30 text-white border border-coh-gradient1/30 shadow-[0_0_0.25rem_rgba(53,123,215,0.15)]'
                      : 'hover:bg-coh-secondary/40 hover:shadow-[0_0_0.25rem_rgba(53,123,215,0.1)] border border-transparent'
                  )}
                >
                  <PowerHoverCard powerFullName={power.full_name} side="right">
                    <div className="flex items-center gap-2 min-w-0 cursor-help">
                      <img
                        src={imageUrl(power.icon)}
                        alt=""
                        className={cn(
                          'w-6 h-6 shrink-0 rounded-sm transition-all duration-150',
                          isSelected
                            ? 'ring-1 ring-coh-gradient1/50 shadow-[0_0_0.25rem_rgba(53,123,215,0.3)]'
                            : 'opacity-80'
                        )}
                        draggable={false}
                      />
                      <div className="min-w-0">
                        <div className="truncate">{power.display_name}</div>
                        {power.display_short_help && (
                          <div className={cn(
                            'text-[0.6875rem] truncate',
                            isSelected ? 'text-coh-info/80' : 'text-muted-foreground'
                          )}>
                            {power.display_short_help}
                          </div>
                        )}
                      </div>
                    </div>
                  </PowerHoverCard>
                  <span className={cn(
                    'ml-auto text-[0.6875rem] shrink-0 font-medium',
                    isSelected ? 'text-coh-gradient4/70' : 'text-muted-foreground'
                  )}>
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
