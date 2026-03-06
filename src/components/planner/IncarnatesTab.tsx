import { Lock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const INCARNATE_SLOTS = [
  {
    name: 'Alpha',
    description: 'Boosts attributes like damage, accuracy, recharge, and endurance reduction.',
    color: 'from-blue-500/20 to-blue-600/10',
  },
  {
    name: 'Judgement',
    description: 'Grants a powerful AoE attack ability.',
    color: 'from-red-500/20 to-red-600/10',
  },
  {
    name: 'Interface',
    description: 'Adds a damage-over-time or debuff proc to your attacks.',
    color: 'from-green-500/20 to-green-600/10',
  },
  {
    name: 'Lore',
    description: 'Summons powerful ally pets to fight alongside you.',
    color: 'from-purple-500/20 to-purple-600/10',
  },
  {
    name: 'Destiny',
    description: 'Grants a powerful team buff or support ability.',
    color: 'from-yellow-500/20 to-yellow-600/10',
  },
  {
    name: 'Hybrid',
    description: 'Provides a toggle or passive that enhances your role.',
    color: 'from-cyan-500/20 to-cyan-600/10',
  },
];

export function IncarnatesTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <p className="text-xs text-muted-foreground">
          Incarnate abilities unlock at level 50, granting powerful endgame enhancements.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {INCARNATE_SLOTS.map((slot) => (
            <div
              key={slot.name}
              className={`rounded-lg p-3 bg-gradient-to-br ${slot.color} border border-white/5`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-[2rem] h-[2rem] rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-[0.875rem] h-[0.875rem] text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground">{slot.name}</span>
              </div>
              <p className="text-[0.625rem] text-muted-foreground leading-relaxed">
                {slot.description}
              </p>
              <div className="mt-2 text-[0.625rem] text-muted-foreground/60 italic">
                Not yet implemented
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
