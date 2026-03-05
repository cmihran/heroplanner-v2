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
const DEFAULT_ZOOM = 1.5;

function getStoredZoom(): number {
  const stored = localStorage.getItem(ZOOM_KEY);
  return stored ? parseFloat(stored) : DEFAULT_ZOOM;
}

export function Settings() {
  const [zoom, setZoom] = useState(getStoredZoom);
  const [saveDir, setSaveDir] = useState(() => localStorage.getItem(SAVE_DIR_KEY) ?? '');

  useEffect(() => {
    api.setZoom(zoom);
  }, []);

  const applyZoom = (newZoom: number) => {
    const clamped = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom)) * 10) / 10;
    setZoom(clamped);
    localStorage.setItem(ZOOM_KEY, String(clamped));
    api.setZoom(clamped);
  };

  const browseSaveDir = async () => {
    const dir = await api.pickDirectory(saveDir || undefined);
    if (dir) {
      setSaveDir(dir);
      localStorage.setItem(SAVE_DIR_KEY, dir);
    }
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
