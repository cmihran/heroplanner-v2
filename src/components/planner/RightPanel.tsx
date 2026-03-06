import { useHeroStore, LEVEL_SLOTS } from '@/stores/heroStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PowerSlotCard } from './PowerSlotCard';
import { InherentsTab } from './InherentsTab';
import { IncarnatesTab } from './IncarnatesTab';
import { AccoladesTab } from './AccoladesTab';

export function RightPanel() {
  const levelToPower = useHeroStore((s) => s.levelToPower);
  const totalSlotsAdded = useHeroStore((s) => s.totalSlotsAdded);

  const slotsRemaining = 67 - totalSlotsAdded;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-coh-dark/40 via-coh-primary/20 to-coh-dark/40">
      <Tabs defaultValue="powers" className="flex-1 flex flex-col min-h-0">
        <div className="relative mx-3 mt-2">
          <div className="flex items-center gap-3">
            <TabsList className="relative z-10 bg-coh-dark/60 border border-coh-secondary/30 shadow-[0_0.0625rem_0.25rem_rgba(0,0,0,0.2)]">
              <TabsTrigger
                value="powers"
                className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-coh-gradient1/20 data-[state=active]:to-transparent data-[state=active]:text-coh-gradient4 data-[state=active]:shadow-[inset_0_0.125rem_0_#ffc442,0_0_0.375rem_rgba(53,123,215,0.15)] transition-all duration-200"
              >
                Powers
              </TabsTrigger>
              <TabsTrigger
                value="inherents"
                className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-coh-gradient1/20 data-[state=active]:to-transparent data-[state=active]:text-coh-gradient4 data-[state=active]:shadow-[inset_0_0.125rem_0_#ffc442,0_0_0.375rem_rgba(53,123,215,0.15)] transition-all duration-200"
              >
                Inherents
              </TabsTrigger>
              <TabsTrigger
                value="incarnates"
                className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-coh-gradient1/20 data-[state=active]:to-transparent data-[state=active]:text-coh-gradient4 data-[state=active]:shadow-[inset_0_0.125rem_0_#ffc442,0_0_0.375rem_rgba(53,123,215,0.15)] transition-all duration-200"
              >
                Incarnates
              </TabsTrigger>
              <TabsTrigger
                value="accolades"
                className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-coh-gradient1/20 data-[state=active]:to-transparent data-[state=active]:text-coh-gradient4 data-[state=active]:shadow-[inset_0_0.125rem_0_#ffc442,0_0_0.375rem_rgba(53,123,215,0.15)] transition-all duration-200"
              >
                Accolades
              </TabsTrigger>
            </TabsList>
            <span className={`ml-auto mr-1 text-[0.6875rem] font-medium px-2 py-0.5 rounded-full border ${
              slotsRemaining > 10
                ? 'text-coh-info/70 border-coh-secondary/30 bg-coh-dark/40'
                : slotsRemaining > 0
                  ? 'text-coh-gradient4/80 border-coh-gradient4/30 bg-coh-gradient4/5'
                  : 'text-coh-accent/80 border-coh-accent/30 bg-coh-accent/5'
            }`}>
              {slotsRemaining} slots
            </span>
          </div>
          <div className="h-[0.0625rem] bg-gradient-to-r from-transparent via-coh-secondary/40 to-transparent mt-1" />
        </div>

        <TabsContent value="powers" className="flex-1 min-h-0">
          <ScrollArea className="h-full @container">
            <div className="p-3 grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-4">
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

        <TabsContent value="inherents" className="flex-1 min-h-0">
          <InherentsTab />
        </TabsContent>

        <TabsContent value="incarnates" className="flex-1 min-h-0">
          <IncarnatesTab />
        </TabsContent>

        <TabsContent value="accolades" className="flex-1 min-h-0">
          <AccoladesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
