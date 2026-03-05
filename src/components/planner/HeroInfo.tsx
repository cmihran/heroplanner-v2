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
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-3">
        {/* Archetype selector */}
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Archetype</label>
          <Select
            value={archetype?.name ?? ''}
            onValueChange={(name) => {
              const at = archetypes.find((a) => a.name === name);
              if (at) selectArchetype(at);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Archetype">
                {archetype && (
                  <span className="flex items-center gap-2">
                    <img src={imageUrl(archetype.icon)} alt="" className="w-5 h-5" />
                    {archetype.display_name}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {archetypes.map((at) => (
                <SelectItem key={at.name} value={at.name}>
                  <span className="flex items-center gap-2">
                    <img src={imageUrl(at.icon)} alt="" className="w-5 h-5" />
                    {at.display_name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Hero name */}
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Hero Name</label>
          <Input
            value={heroName}
            onChange={(e) => setHeroName(e.target.value)}
            placeholder="Enter hero name"
          />
        </div>

        {/* Origin selector */}
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Origin</label>
          <Select
            value={origin?.name ?? ''}
            onValueChange={(name) => {
              const o = origins.find((x) => x.name === name);
              if (o) selectOrigin(o);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Origin">
                {origin && (
                  <span className="flex items-center gap-2">
                    <img src={imageUrl(origin.icon)} alt="" className="w-5 h-5" />
                    {origin.name}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {origins.map((o) => (
                <SelectItem key={o.name} value={o.name}>
                  <span className="flex items-center gap-2">
                    <img src={imageUrl(o.icon)} alt="" className="w-5 h-5" />
                    {o.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
