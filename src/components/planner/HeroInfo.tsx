import { useHeroStore } from '@/stores/heroStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { imageUrl } from '@/lib/images';

export function HeroInfo() {
  const archetypes = useHeroStore((s) => s.archetypes);
  const origins = useHeroStore((s) => s.origins);
  const archetype = useHeroStore((s) => s.archetype);
  const origin = useHeroStore((s) => s.origin);
  const heroName = useHeroStore((s) => s.heroName);
  const selectArchetype = useHeroStore((s) => s.selectArchetype);
  const selectOrigin = useHeroStore((s) => s.selectOrigin);
  const setHeroName = useHeroStore((s) => s.setHeroName);

  return (
    <div className="relative bg-coh-dark/60">
      {/* Top gradient accent line */}
      <div
        className="h-[0.125rem] w-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #357bd7 30%, #ffc442 50%, #357bd7 70%, transparent 100%)',
        }}
      />
      {/* Panel content with beveled edges */}
      <div className="p-3 space-y-3 border-b border-coh-secondary/40 shadow-[inset_0_0.0625rem_0_rgba(53,123,215,0.1),inset_0_-0.0625rem_0_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3">
          {/* Archetype selector */}
          <div className="flex-1">
            <label className="text-[0.6875rem] font-medium text-coh-gradient4/80 mb-1 block uppercase tracking-wider">
              Archetype
            </label>
            <Select
              value={archetype?.name ?? ''}
              onValueChange={(name) => {
                const at = archetypes.find((a) => a.name === name);
                if (at) selectArchetype(at);
              }}
            >
              <SelectTrigger className="bg-coh-dark/80 border-coh-secondary/60 hover:border-coh-gradient1/60 hover:shadow-[0_0_0.375rem_rgba(53,123,215,0.15)] transition-all duration-200">
                <SelectValue placeholder="Select Archetype">
                  {archetype && (
                    <span className="flex items-center gap-2">
                      <img src={imageUrl(archetype.icon)} alt="" className="w-5 h-5" draggable={false} />
                      {archetype.display_name}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {archetypes.map((at) => (
                  <SelectItem key={at.name} value={at.name}>
                    <span className="flex items-center gap-2">
                      <img src={imageUrl(at.icon)} alt="" className="w-5 h-5" draggable={false} />
                      {at.display_name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hero name */}
          <div className="flex-1">
            <label className="text-[0.6875rem] font-medium text-coh-gradient4/80 mb-1 block uppercase tracking-wider">
              Hero Name
            </label>
            <Input
              value={heroName}
              onChange={(e) => setHeroName(e.target.value)}
              placeholder="Enter hero name"
              className="bg-coh-dark/80 border-coh-secondary/60 hover:border-coh-gradient1/60 hover:shadow-[0_0_0.375rem_rgba(53,123,215,0.15)] focus-visible:ring-coh-gradient1/40 focus-visible:border-coh-gradient1/60 transition-all duration-200"
            />
          </div>

          {/* Origin selector */}
          <div className="flex-1">
            <label className="text-[0.6875rem] font-medium text-coh-gradient4/80 mb-1 block uppercase tracking-wider">
              Origin
            </label>
            <Select
              value={origin?.name ?? ''}
              onValueChange={(name) => {
                const o = origins.find((x) => x.name === name);
                if (o) selectOrigin(o);
              }}
            >
              <SelectTrigger className="bg-coh-dark/80 border-coh-secondary/60 hover:border-coh-gradient1/60 hover:shadow-[0_0_0.375rem_rgba(53,123,215,0.15)] transition-all duration-200">
                <SelectValue placeholder="Select Origin">
                  {origin && (
                    <span className="flex items-center gap-2">
                      <img src={imageUrl(origin.icon)} alt="" className="w-5 h-5" draggable={false} />
                      {origin.name}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {origins.map((o) => (
                  <SelectItem key={o.name} value={o.name}>
                    <span className="flex items-center gap-2">
                      <img src={imageUrl(o.icon)} alt="" className="w-5 h-5" draggable={false} />
                      {o.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
