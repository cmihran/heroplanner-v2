import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { Settings as SettingsIcon, Minus, Plus, FolderOpen, ZoomIn, Sparkles, MousePointerClick, Palette, HardDrive } from 'lucide-react';
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

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-all duration-200 cursor-pointer shrink-0 ${
        enabled
          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-[0_0_0.5rem_rgba(16,185,129,0.3)]'
          : 'bg-white/10 shadow-[inset_0_0.0625rem_0.125rem_rgba(0,0,0,0.4)]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all duration-200 ${
          enabled
            ? 'translate-x-4 bg-white shadow-[0_0.0625rem_0.25rem_rgba(0,0,0,0.3)]'
            : 'bg-white/60 shadow-[0_0.0625rem_0.125rem_rgba(0,0,0,0.2)]'
        }`}
      />
    </button>
  );
}

function SettingRow({ icon, label, description, children }: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <div className="w-6 h-6 rounded flex items-center justify-center bg-coh-gradient1/10 text-coh-gradient1/70 shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-white/90">{label}</span>
          {children}
        </div>
        {description && (
          <p className="text-[0.625rem] text-white/35 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: apply initial zoom/theme from localStorage
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
      <Tip content="Settings">
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/10">
            <SettingsIcon className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent
        className="w-[18rem] p-0 bg-gradient-to-b from-coh-dark via-coh-dark to-coh-primary border-coh-gradient1/20 shadow-[0_0.5rem_2rem_rgba(0,0,0,0.6),0_0_0_1px_rgba(53,123,215,0.08)]"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-3.5 w-3.5 text-coh-gradient1/60" />
            <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">Settings</span>
          </div>
          <div className="h-px bg-gradient-to-r from-coh-gradient1/30 via-coh-gradient1/10 to-transparent mt-2" />
        </div>

        <div className="px-4 pb-4">
          {/* Zoom */}
          <SettingRow icon={<ZoomIn className="h-3.5 w-3.5" />} label="Zoom">
            <div className="flex items-center gap-1.5">
              <button
                className="w-5 h-5 rounded flex items-center justify-center bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors disabled:opacity-30"
                onClick={() => applyZoom(zoom - ZOOM_STEP)}
                disabled={zoom <= ZOOM_MIN}
              >
                <Minus className="h-2.5 w-2.5" />
              </button>
              <span className="text-[0.6875rem] text-coh-gradient4/80 font-mono w-8 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                className="w-5 h-5 rounded flex items-center justify-center bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors disabled:opacity-30"
                onClick={() => applyZoom(zoom + ZOOM_STEP)}
                disabled={zoom >= ZOOM_MAX}
              >
                <Plus className="h-2.5 w-2.5" />
              </button>
              {zoom !== 1.0 && (
                <button
                  className="text-[0.625rem] text-white/30 hover:text-white/60 transition-colors ml-0.5"
                  onClick={() => applyZoom(1.0)}
                >
                  reset
                </button>
              )}
            </div>
          </SettingRow>

          <div className="h-px bg-white/5" />

          {/* Vital Bar Animation */}
          <SettingRow
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Vital Bar Shimmer"
            description="Animated shine on HP and Endurance bars"
          >
            <Toggle enabled={shimmer} onChange={toggleShimmer} />
          </SettingRow>

          <div className="h-px bg-white/5" />

          {/* Hover Cards */}
          <SettingRow
            icon={<MousePointerClick className="h-3.5 w-3.5" />}
            label="Hover Cards"
            description="Power and enhancement info on hover"
          >
            <Toggle enabled={hoverCards} onChange={toggleHoverCards} />
          </SettingRow>

          <div className="h-px bg-white/5" />

          {/* Theme */}
          <SettingRow icon={<Palette className="h-3.5 w-3.5" />} label="Theme">
            <div className="flex gap-1.5">
              <button
                onClick={() => setTheme('hero')}
                className={`px-3 h-6 rounded text-[0.625rem] font-semibold tracking-wide transition-all ${
                  theme === 'hero'
                    ? 'bg-[#357bd7] text-white shadow-[0_0_0.5rem_rgba(53,123,215,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                }`}
              >
                HERO
              </button>
              <button
                onClick={() => setTheme('villain')}
                className={`px-3 h-6 rounded text-[0.625rem] font-semibold tracking-wide transition-all ${
                  theme === 'villain'
                    ? 'bg-[#c43030] text-white shadow-[0_0_0.5rem_rgba(196,48,48,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                }`}
              >
                VILLAIN
              </button>
            </div>
          </SettingRow>

          <div className="h-px bg-white/5" />

          {/* Save Location */}
          <SettingRow
            icon={<HardDrive className="h-3.5 w-3.5" />}
            label="Save Location"
            description={saveDir || undefined}
          >
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[0.625rem] text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10"
                onClick={browseSaveDir}
              >
                <FolderOpen className="h-3 w-3 mr-1" />
                Browse
              </Button>
              {saveDir && (
                <button
                  className="text-[0.625rem] text-white/30 hover:text-white/60 transition-colors"
                  onClick={resetSaveDir}
                >
                  reset
                </button>
              )}
            </div>
          </SettingRow>
        </div>
      </PopoverContent>
    </Popover>
  );
}
