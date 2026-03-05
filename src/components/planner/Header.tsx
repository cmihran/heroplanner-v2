import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Save, FolderOpen } from 'lucide-react';
import { Settings } from './Settings';
import { useHeroStore } from '@/stores/heroStore';

const appWindow = getCurrentWindow();

export function Header() {
  const archetype = useHeroStore((s) => s.archetype);
  const isDirty = useHeroStore((s) => s.isDirty);
  const saveBuild = useHeroStore((s) => s.saveBuild);
  const loadBuild = useHeroStore((s) => s.loadBuild);

  return (
    <header
      className="flex items-center justify-between bg-[radial-gradient(circle,rgba(53,136,224,1)_0%,rgba(0,0,0,1)_100%)] select-none"
    >
      {/* Draggable title area */}
      <div
        className="flex-1 flex items-center justify-center py-2 px-4"
        data-tauri-drag-region
      >
        <h1
          className="text-2xl font-hero bg-gradient-to-b from-coh-gradient3 to-coh-gradient4 bg-clip-text text-transparent tracking-wider pointer-events-none [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.9))_drop-shadow(0_0_4px_rgba(255,255,255,0.4))]"
          data-tauri-drag-region
        >
          Hero Planner
        </h1>
      </div>

      {/* Window controls */}
      <div className="flex items-center">
        <button
          className="h-8 w-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          onClick={() => saveBuild()}
          disabled={!archetype || !isDirty}
          title="Save Build"
        >
          <Save className="h-4 w-4" />
        </button>
        <button
          className="h-8 w-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => loadBuild()}
          title="Load Build"
        >
          <FolderOpen className="h-4 w-4" />
        </button>
        <Settings />
        <button
          className="h-8 w-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => appWindow.minimize()}
          title="Minimize"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          className="h-8 w-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => appWindow.toggleMaximize()}
          title="Maximize"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          className="h-8 w-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-600 transition-colors"
          onClick={() => appWindow.close()}
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
