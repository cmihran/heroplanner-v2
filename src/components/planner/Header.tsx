import { Settings } from './Settings';

export function Header() {
  return (
    <header className="flex items-center justify-between py-3 px-4 bg-[radial-gradient(circle,rgba(53,136,224,1)_0%,rgba(0,0,0,1)_100%)]">
      <div className="w-10" />
      <h1 className="text-3xl font-hero bg-gradient-to-b from-coh-gradient3 to-coh-gradient4 bg-clip-text text-transparent tracking-wider">
        Hero Planner
      </h1>
      <Settings />
    </header>
  );
}
