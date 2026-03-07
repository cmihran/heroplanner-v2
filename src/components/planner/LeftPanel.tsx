import { useHeroStore } from '@/stores/heroStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HeroInfo } from './HeroInfo';
import { PowerSetSelector } from './PowerSetSelector';
import { TotalStatsTab } from './TotalStatsTab';
import { SetBonusesTab } from './SetBonusesTab';

export function LeftPanel() {
  const primarySetChoices = useHeroStore((s) => s.primarySetChoices);
  const secondarySetChoices = useHeroStore((s) => s.secondarySetChoices);
  const powerPoolChoices = useHeroStore((s) => s.powerPoolChoices);
  const selectedPrimary = useHeroStore((s) => s.buildView?.selectedPrimary ?? null);
  const selectedSecondary = useHeroStore((s) => s.buildView?.selectedSecondary ?? null);
  const selectedPool1 = useHeroStore((s) => s.buildView?.selectedPool1 ?? null);
  const selectedPool2 = useHeroStore((s) => s.buildView?.selectedPool2 ?? null);
  const selectedPool3 = useHeroStore((s) => s.buildView?.selectedPool3 ?? null);
  const selectedPool4 = useHeroStore((s) => s.buildView?.selectedPool4 ?? null);
  const primaryPowers = useHeroStore((s) => s.primaryPowers);
  const secondaryPowers = useHeroStore((s) => s.secondaryPowers);
  const pool1Powers = useHeroStore((s) => s.pool1Powers);
  const pool2Powers = useHeroStore((s) => s.pool2Powers);
  const pool3Powers = useHeroStore((s) => s.pool3Powers);
  const pool4Powers = useHeroStore((s) => s.pool4Powers);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-coh-dark/50 via-coh-dark/30 to-coh-dark/50 border-r border-coh-secondary/30 shadow-[inset_-0.0625rem_0_0_rgba(53,123,215,0.08),0.125rem_0_0.5rem_rgba(0,0,0,0.3)]">
      <HeroInfo />
      <Tabs defaultValue="powersets" className="flex-1 flex flex-col min-h-0">
        {/* Tab bar with bottom border and active tab break-through effect */}
        <div className="relative mx-3 mt-2">
          <TabsList className="relative z-10 bg-coh-dark/60 border border-coh-secondary/30 shadow-[0_0.0625rem_0.25rem_rgba(0,0,0,0.2)]">
            <TabsTrigger
              value="powersets"
              className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-coh-gradient1/20 data-[state=active]:to-transparent data-[state=active]:text-coh-gradient4 data-[state=active]:shadow-[inset_0_0.125rem_0_#ffc442,0_0_0.375rem_rgba(53,123,215,0.15)] transition-all duration-200"
            >
              Power Sets
            </TabsTrigger>
            <TabsTrigger
              value="totalstats"
              className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-coh-gradient1/20 data-[state=active]:to-transparent data-[state=active]:text-coh-gradient4 data-[state=active]:shadow-[inset_0_0.125rem_0_#ffc442,0_0_0.375rem_rgba(53,123,215,0.15)] transition-all duration-200"
            >
              Total Stats
            </TabsTrigger>
            <TabsTrigger
              value="setbonuses"
              className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-coh-gradient1/20 data-[state=active]:to-transparent data-[state=active]:text-coh-gradient4 data-[state=active]:shadow-[inset_0_0.125rem_0_#ffc442,0_0_0.375rem_rgba(53,123,215,0.15)] transition-all duration-200"
            >
              Set Bonuses
            </TabsTrigger>
          </TabsList>
          {/* Divider line below tabs */}
          <div className="h-[0.0625rem] bg-gradient-to-r from-transparent via-coh-secondary/40 to-transparent mt-1" />
        </div>

        <TabsContent value="powersets" className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              <PowerSetSelector
                label="Primary Power Set"
                choices={primarySetChoices}
                powers={primaryPowers}
                slot="primary"
                selectedValue={selectedPrimary}
              />
              <PowerSetSelector
                label="Secondary Power Set"
                choices={secondarySetChoices}
                powers={secondaryPowers}
                slot="secondary"
                selectedValue={selectedSecondary}
              />
              {/* Divider between main sets and pools */}
              <div className="py-1">
                <div className="h-[0.0625rem] bg-gradient-to-r from-transparent via-coh-secondary/30 to-transparent" />
              </div>
              <PowerSetSelector
                label="Power Pool 1"
                choices={powerPoolChoices}
                powers={pool1Powers}
                slot="pool1"
                selectedValue={selectedPool1}
              />
              <PowerSetSelector
                label="Power Pool 2"
                choices={powerPoolChoices}
                powers={pool2Powers}
                slot="pool2"
                selectedValue={selectedPool2}
              />
              <PowerSetSelector
                label="Power Pool 3"
                choices={powerPoolChoices}
                powers={pool3Powers}
                slot="pool3"
                selectedValue={selectedPool3}
              />
              <PowerSetSelector
                label="Power Pool 4"
                choices={powerPoolChoices}
                powers={pool4Powers}
                slot="pool4"
                selectedValue={selectedPool4}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="totalstats" className="flex-1 min-h-0">
          <TotalStatsTab />
        </TabsContent>

        <TabsContent value="setbonuses" className="flex-1 min-h-0">
          <SetBonusesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
