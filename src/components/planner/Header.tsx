import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Minus, Square, X, Save, FilePlus2, FolderOpen, Trash2, Heart } from 'lucide-react';
import { Settings } from './Settings';
import { confirm } from './ConfirmDialog';
import { useHeroStore } from '@/stores/heroStore';

const appWindow = getCurrentWindow();

const DONATE_URL = 'https://ko-fi.com/heroplanner';

export function Header() {
  const archetype = useHeroStore((s) => s.archetype);
  const isDirty = useHeroStore((s) => s.isDirty);
  const saveBuild = useHeroStore((s) => s.saveBuild);
  const saveAsNewBuild = useHeroStore((s) => s.saveAsNewBuild);
  const loadBuild = useHeroStore((s) => s.loadBuild);
  const clearBuild = useHeroStore((s) => s.clearBuild);

  const handleClear = async () => {
    const ok = await confirm('Clear Build', 'This will remove all powers and enhancements. Are you sure?', 'Clear');
    if (ok) clearBuild();
  };

  const handleLoad = async () => {
    if (isDirty) {
      const ok = await confirm('Unsaved Changes', 'You have unsaved changes that will be lost. Continue loading?', 'Load');
      if (!ok) return;
    }
    loadBuild();
  };

  const openDonate = async () => {
    try {
      await openUrl(DONATE_URL);
    } catch {
      window.open(DONATE_URL, '_blank');
    }
  };

  return (
    <header
      className="relative flex items-center justify-between bg-[radial-gradient(circle,rgba(53,136,224,1)_0%,rgba(0,0,0,1)_100%)] select-none"
      data-tauri-drag-region
    >
      {/* Centered title — absolute so it's centered relative to the full window width */}
      <h1
        className="absolute inset-0 flex items-center justify-center text-2xl font-hero bg-gradient-to-b from-coh-gradient3 to-coh-gradient4 bg-clip-text text-transparent tracking-wider pointer-events-none [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.9))_drop-shadow(0_0_4px_rgba(255,255,255,0.4))]"
        data-tauri-drag-region
      >
        Hero Planner
      </h1>

      {/* App controls (left) */}
      <div className="relative z-10 flex items-center py-1 pl-2">
        <Settings />
        <button
          className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          onClick={() => saveBuild()}
          disabled={!archetype || !isDirty}
          title="Save Build"
        >
          <Save className="h-4 w-4" />
        </button>
        <button
          className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          onClick={() => saveAsNewBuild()}
          disabled={!archetype}
          title="Save As..."
        >
          <FilePlus2 className="h-4 w-4" />
        </button>
        <button
          className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          onClick={handleLoad}
          title="Load Build"
        >
          <FolderOpen className="h-4 w-4" />
        </button>
        <button
          className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-red-400 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          onClick={handleClear}
          disabled={!archetype}
          title="Clear Build"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-pink-400 hover:bg-white/10 transition-colors"
          onClick={openDonate}
          title="Support Development"
        >
          <Heart className="h-4 w-4" />
        </button>
      </div>

      {/* Window controls (right) */}
      <div className="relative z-10 flex items-center py-1 ml-auto pr-2">
        <button
          className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => appWindow.minimize()}
          title="Minimize"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => appWindow.toggleMaximize()}
          title="Maximize"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-red-600 transition-colors"
          onClick={() => appWindow.close()}
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
