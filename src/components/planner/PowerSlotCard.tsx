import { useHeroStore, type SelectedPower } from '@/stores/heroStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { imageUrl } from '@/lib/images';
import { Plus, Minus } from 'lucide-react';

interface PowerSlotCardProps {
  level: number;
  selectedPower: SelectedPower | null;
}

export function PowerSlotCard({ level, selectedPower }: PowerSlotCardProps) {
  const addSlot = useHeroStore((s) => s.addSlot);
  const removeSlot = useHeroStore((s) => s.removeSlot);
  const canAddMore = useHeroStore((s) => s.canAddMoreSlots);

  if (!selectedPower) {
    return (
      <Card className="bg-coh-dark/50 border-border/30">
        <CardHeader className="p-3">
          <CardTitle className="text-sm text-muted-foreground">
            Level {level}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-xs text-muted-foreground italic">Empty</p>
        </CardContent>
      </Card>
    );
  }

  const { power, numSlots } = selectedPower;

  return (
    <Card className="bg-gradient-to-b from-coh-gradient1/20 to-coh-gradient2/40 border-coh-secondary/50">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Lv{level}</span>
          <img src={imageUrl(power.icon)} alt="" className="w-5 h-5" />
          <span className="truncate">{power.display_name}</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-coh-secondary/60 text-coh-info">
            {power.power_type}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {power.display_short_help && (
          <p className="text-xs text-muted-foreground mb-2">{power.display_short_help}</p>
        )}

        {/* Enhancement slots */}
        {power.max_boosts > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1">
              {Array.from({ length: numSlots }, (_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border border-coh-info/50 bg-coh-secondary/30 flex items-center justify-center text-[10px] text-muted-foreground"
                >
                  {i + 1}
                </div>
              ))}
              {Array.from({ length: power.max_boosts - numSlots }, (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-6 h-6 rounded-full border border-border/30 bg-transparent"
                />
              ))}
            </div>
            <div className="flex gap-0.5 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => addSlot(power.full_name)}
                disabled={numSlots >= power.max_boosts || !canAddMore()}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeSlot(power.full_name)}
                disabled={numSlots <= 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
