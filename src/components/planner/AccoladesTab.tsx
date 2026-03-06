import { Award, Search } from 'lucide-react';

export function AccoladesTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-[3rem] h-[3rem] rounded-full bg-coh-secondary/40 flex items-center justify-center mb-4">
        <Award className="w-[1.5rem] h-[1.5rem] text-coh-gradient1" />
      </div>

      <h3 className="text-sm font-medium text-foreground mb-2">Accolade Powers</h3>

      <p className="text-xs text-muted-foreground max-w-[20rem] mb-4 leading-relaxed">
        Select accolade powers to include their passive bonuses in your build stats.
        Accolades provide permanent stat boosts like increased HP, endurance, and
        damage resistance.
      </p>

      <div className="w-full max-w-[16rem] relative opacity-40 pointer-events-none">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[0.75rem] h-[0.75rem] text-muted-foreground" />
        <div className="w-full h-[2rem] rounded-md border border-border bg-white/5 pl-8 flex items-center">
          <span className="text-xs text-muted-foreground">Search accolades...</span>
        </div>
      </div>

      <p className="text-[0.625rem] text-muted-foreground/60 mt-4 italic">
        Not yet implemented
      </p>
    </div>
  );
}
