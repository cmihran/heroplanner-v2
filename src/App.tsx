import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Toaster } from 'sonner';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Header } from '@/components/planner/Header';
import { LeftPanel } from '@/components/planner/LeftPanel';
import { RightPanel } from '@/components/planner/RightPanel';
import { ConfirmDialog } from '@/components/planner/ConfirmDialog';
import { useHeroStore } from '@/stores/heroStore';

const appWindow = getCurrentWindow();
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
          className="fixed z-50"
          style={style}
          onMouseDown={() => appWindow.startResizeDragging(dir)}
        />
      ))}
      <Header />
      <div
        className="h-[2px] flex-shrink-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #3588e0 20%, #c8a84e 50%, #3588e0 80%, transparent 100%)',
        }}
      />
      <ResizablePanelGroup className="flex-1">
        <ResizablePanel defaultSize={30} minSize={20}>
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
