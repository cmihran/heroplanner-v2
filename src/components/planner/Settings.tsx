import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Minus, Plus, FolderOpen } from 'lucide-react';
import { api } from '@/lib/api';

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_KEY = 'heroplanner-zoom';
const SAVE_DIR_KEY = 'heroplanner-save-dir';
const SHIMMER_KEY = 'heroplanner-shimmer';
const THEME_KEY = 'heroplanner-theme';
const HOVER_KEY = 'heroplanner-hover';
const DEFAULT_ZOOM = 1.5;

function getStoredZoom(): number {
  const stored = localStorage.getItem(ZOOM_KEY);
  return stored ? parseFloat(stored) : DEFAULT_ZOOM;
}

function applyRootFontSize(factor: number) {
  document.documentElement.style.fontSize = `${factor * 16}px`;
}

function applyTheme(theme: string) {
  if (theme === 'villain') {
    document.documentElement.setAttribute('data-theme', 'villain');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function Settings() {
  const [zoom, setZoom] = useState(getStoredZoom);
  const [shimmer, setShimmer] = useState(() => {
    const stored = localStorage.getItem(SHIMMER_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_KEY) ?? 'hero');
  const [hoverCards, setHoverCards] = useState(() => {
    const stored = localStorage.getItem(HOVER_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [saveDir, setSaveDir] = useState(() => localStorage.getItem(SAVE_DIR_KEY) ?? '');

  useEffect(() => {
    // Reset webview zoom to 1.0 (may have been set by previous version)
    api.setZoom(1.0);
    applyRootFontSize(zoom);
    applyTheme(theme);
  }, []);

  const applyZoom = (newZoom: number) => {
    const clamped = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom)) * 10) / 10;
    setZoom(clamped);
    localStorage.setItem(ZOOM_KEY, String(clamped));
    applyRootFontSize(clamped);
  };

  const browseSaveDir = async () => {
    const dir = await api.pickDirectory(saveDir || undefined);
    if (dir) {
      setSaveDir(dir);
      localStorage.setItem(SAVE_DIR_KEY, dir);
    }
  };

  const toggleShimmer = () => {
    const next = !shimmer;
    setShimmer(next);
    localStorage.setItem(SHIMMER_KEY, String(next));
  };

  const toggleHoverCards = () => {
    const next = !hoverCards;
    setHoverCards(next);
    localStorage.setItem(HOVER_KEY, String(next));
  };

  const setTheme = (t: string) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
  };

  const resetSaveDir = () => {
    setSaveDir('');
    localStorage.removeItem(SAVE_DIR_KEY);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/10">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-coh-secondary border-white/10" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-white/90 border-b border-white/10 pb-2">Settings</h4>
          <div className="space-y-2 bg-white/5 rounded-lg p-3">
            <label className="text-xs font-medium text-white/80">Zoom</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-full border-white/20"
                onClick={() => applyZoom(zoom - ZOOM_STEP)}
                disabled={zoom <= ZOOM_MIN}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm text-white/80 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-full border-white/20"
                onClick={() => applyZoom(zoom + ZOOM_STEP)}
                disabled={zoom >= ZOOM_MAX}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-white/50 hover:text-white/80 h-7 px-2"
                onClick={() => applyZoom(1.0)}
              >
                Reset
              </Button>
            </div>
          </div>
          <div className="space-y-2 bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/80">Vital Bar Animation</label>
              <button
                onClick={toggleShimmer}
                className={`relative w-8 h-[1.125rem] rounded-full transition-colors cursor-pointer ${shimmer ? 'bg-emerald-600' : 'bg-white/20'}`}
              >
                <span
                  className={`absolute top-[0.125rem] left-[0.125rem] w-[0.875rem] h-[0.875rem] bg-white rounded-full transition-transform ${shimmer ? 'translate-x-[0.625rem]' : ''}`}
                />
              </button>
            </div>
            <p className="text-[0.625rem] text-white/40">Subtle shimmer effect on HP and Endurance bars</p>
          </div>
          <div className="space-y-2 bg-white/5 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white/80">Hover Cards</label>
              <button
                onClick={toggleHoverCards}
                className={`relative w-8 h-[1.125rem] rounded-full transition-colors cursor-pointer ${hoverCards ? 'bg-emerald-600' : 'bg-white/20'}`}
              >
                <span
                  className={`absolute top-[0.125rem] left-[0.125rem] w-[0.875rem] h-[0.875rem] bg-white rounded-full transition-transform ${hoverCards ? 'translate-x-[0.625rem]' : ''}`}
                />
              </button>
            </div>
            <p className="text-[0.625rem] text-white/40">Show power and enhancement info on hover</p>
          </div>
          <div className="space-y-2 bg-white/5 rounded-lg p-3">
            <label className="text-xs font-medium text-white/80">Theme</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('hero')}
                className={`flex-1 h-8 rounded-md text-xs font-medium transition-all ${
                  theme === 'hero'
                    ? 'bg-[#357bd7] text-white ring-2 ring-[#357bd7]/50 shadow-[0_0_0.5rem_rgba(53,123,215,0.3)]'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                Hero
              </button>
              <button
                onClick={() => setTheme('villain')}
                className={`flex-1 h-8 rounded-md text-xs font-medium transition-all ${
                  theme === 'villain'
                    ? 'bg-[#c43030] text-white ring-2 ring-[#c43030]/50 shadow-[0_0_0.5rem_rgba(196,48,48,0.3)]'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                Villain
              </button>
            </div>
          </div>
          <div className="space-y-2 bg-white/5 rounded-lg p-3">
            <label className="text-xs font-medium text-white/80">Save Location</label>
            <div className="text-xs text-white/50 truncate" title={saveDir || 'Default'}>
              {saveDir || 'Default'}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 border-white/20 text-xs"
                onClick={browseSaveDir}
              >
                <FolderOpen className="h-3 w-3 mr-1" />
                Browse
              </Button>
              {saveDir && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-white/50 hover:text-white/80 h-7 px-2"
                  onClick={resetSaveDir}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
