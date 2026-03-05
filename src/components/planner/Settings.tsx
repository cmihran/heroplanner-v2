import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Minus, Plus } from 'lucide-react';
import { api } from '@/lib/api';

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_KEY = 'heroplanner-zoom';
const DEFAULT_ZOOM = 1.5;

function getStoredZoom(): number {
  const stored = localStorage.getItem(ZOOM_KEY);
  return stored ? parseFloat(stored) : DEFAULT_ZOOM;
}

export function Settings() {
  const [zoom, setZoom] = useState(getStoredZoom);

  useEffect(() => {
    api.setZoom(zoom);
  }, []);

  const applyZoom = (newZoom: number) => {
    const clamped = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom)) * 10) / 10;
    setZoom(clamped);
    localStorage.setItem(ZOOM_KEY, String(clamped));
    api.setZoom(clamped);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 bg-coh-secondary border-white/10" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-white/90">Settings</h4>
          <div className="space-y-1.5">
            <label className="text-xs text-white/60">Zoom</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-white/20"
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
                className="h-7 w-7 border-white/20"
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
