import { useHeroStore } from '@/stores/heroStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HeroInfo } from './HeroInfo';
import { PowerSetSelector } from './PowerSetSelector';

export function LeftPanel() {
  const primarySetChoices = useHeroStore((s) => s.primarySetChoices);
  const secondarySetChoices = useHeroStore((s) => s.secondarySetChoices);
  const powerPoolChoices = useHeroStore((s) => s.powerPoolChoices);
  const primaryPowers = useHeroStore((s) => s.primaryPowers);
  const secondaryPowers = useHeroStore((s) => s.secondaryPowers);
  const pool1Powers = useHeroStore((s) => s.pool1Powers);
  const pool2Powers = useHeroStore((s) => s.pool2Powers);
  const pool3Powers = useHeroStore((s) => s.pool3Powers);
  const pool4Powers = useHeroStore((s) => s.pool4Powers);

  return (
    <div className="h-full flex flex-col bg-coh-dark/30">
      <HeroInfo />
      <Separator />
      <Tabs defaultValue="powersets" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 bg-coh-dark">
          <TabsTrigger value="powersets">Power Sets</TabsTrigger>
          <TabsTrigger value="totalstats">Total Stats</TabsTrigger>
          <TabsTrigger value="setbonuses">Set Bonuses</TabsTrigger>
        </TabsList>

        <TabsContent value="powersets" className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              <PowerSetSelector
                label="Primary Power Set"
                choices={primarySetChoices}
                powers={primaryPowers}
                slot="primary"
              />
              <PowerSetSelector
                label="Secondary Power Set"
                choices={secondarySetChoices}
                powers={secondaryPowers}
                slot="secondary"
              />
              <PowerSetSelector
                label="Power Pool 1"
                choices={powerPoolChoices}
                powers={pool1Powers}
                slot="pool1"
              />
              <PowerSetSelector
                label="Power Pool 2"
                choices={powerPoolChoices}
                powers={pool2Powers}
                slot="pool2"
              />
              <PowerSetSelector
                label="Power Pool 3"
                choices={powerPoolChoices}
                powers={pool3Powers}
                slot="pool3"
              />
              <PowerSetSelector
                label="Power Pool 4"
                choices={powerPoolChoices}
                powers={pool4Powers}
                slot="pool4"
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="totalstats" className="flex-1 p-4">
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Total Stats — Coming soon
          </div>
        </TabsContent>

        <TabsContent value="setbonuses" className="flex-1 p-4">
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Set Bonuses — Coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
