import { useHeroStore, LEVEL_SLOTS } from '@/stores/heroStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PowerSlotCard } from './PowerSlotCard';

export function RightPanel() {
  const levelToPower = useHeroStore((s) => s.levelToPower);
  const totalSlotsAdded = useHeroStore((s) => s.totalSlotsAdded);

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="powers" className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 mx-3 mt-2">
          <TabsList className="bg-coh-dark">
            <TabsTrigger value="powers">Powers</TabsTrigger>
            <TabsTrigger value="inherents">Inherents</TabsTrigger>
            <TabsTrigger value="incarnates">Incarnates</TabsTrigger>
            <TabsTrigger value="accolades">Accolades</TabsTrigger>
          </TabsList>
          <span className="text-xs text-muted-foreground ml-auto mr-3">
            Slots Remaining: {67 - totalSlotsAdded}
          </span>
        </div>

        <TabsContent value="powers" className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {LEVEL_SLOTS.map((level) => (
                <PowerSlotCard
                  key={level}
                  level={level}
                  selectedPower={levelToPower[level]}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="inherents" className="flex-1 p-4">
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Inherents — Coming soon
          </div>
        </TabsContent>

        <TabsContent value="incarnates" className="flex-1 p-4">
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Incarnates — Coming soon
          </div>
        </TabsContent>

        <TabsContent value="accolades" className="flex-1 p-4">
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Accolades — Coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
