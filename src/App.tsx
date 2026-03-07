import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Toaster } from 'sonner';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Header } from '@/components/planner/Header';
import { LeftPanel } from '@/components/planner/LeftPanel';
import { RightPanel } from '@/components/planner/RightPanel';
import { ConfirmDialog, confirm } from '@/components/planner/ConfirmDialog';
import { useHeroStore } from '@/stores/heroStore';

const appWindow = getCurrentWindow();
const isTauri = '__TAURI_INTERNALS__' in window;
const EDGE = 6; // px resize zone

const edges = [
  { dir: 'North', style: { top: 0, left: EDGE, right: EDGE, height: EDGE, cursor: 'n-resize' } },
  { dir: 'South', style: { bottom: 0, left: EDGE, right: EDGE, height: EDGE, cursor: 's-resize' } },
  { dir: 'West', style: { left: 0, top: EDGE, bottom: EDGE, width: EDGE, cursor: 'w-resize' } },
  { dir: 'East', style: { right: 0, top: EDGE, bottom: EDGE, width: EDGE, cursor: 'e-resize' } },
  { dir: 'NorthWest', style: { top: 0, left: 0, width: EDGE, height: EDGE, cursor: 'nw-resize' } },
  { dir: 'NorthEast', style: { top: 0, right: 0, width: EDGE, height: EDGE, cursor: 'ne-resize' } },
  { dir: 'SouthWest', style: { bottom: 0, left: 0, width: EDGE, height: EDGE, cursor: 'sw-resize' } },
  { dir: 'SouthEast', style: { bottom: 0, right: 0, width: EDGE, height: EDGE, cursor: 'se-resize' } },
] as const;

function App() {
  const loadInitialData = useHeroStore((s) => s.loadInitialData);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (isTauri) invoke('log_frontend_ready');
  }, []);

  // Intercept OS-level window close (Alt+F4, taskbar close) to warn about unsaved changes
  useEffect(() => {
    if (!isTauri) return;
    const unlisten = appWindow.onCloseRequested(async (event) => {
      const dirty = useHeroStore.getState().buildView?.isDirty ?? false;
      if (dirty) {
        event.preventDefault();
        const ok = await confirm('Unsaved Changes', 'You have unsaved changes. Close without saving?', 'Close');
        if (ok) await appWindow.destroy();
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  return (
    <div className="relative h-screen flex flex-col bg-coh-primary text-foreground overflow-hidden rounded-lg border border-coh-secondary">
      <ConfirmDialog />
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        style={{ fontSize: 'inherit' }}
        toastOptions={{
          style: { fontSize: '0.875rem' },
        }}
      />
      {edges.map(({ dir, style }) => (
        <div
          key={dir}
          className="fixed z-[5]"
          style={style}
          onMouseDown={() => appWindow.startResizeDragging(dir)}
        />
      ))}
      <Header />
      <div className="h-[2px] flex-shrink-0 header-divider" />
      <ResizablePanelGroup className="flex-1">
        <ResizablePanel defaultSize={30} minSize={20} className="overflow-hidden">
          <LeftPanel />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70} minSize={30}>
          <RightPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default App;
