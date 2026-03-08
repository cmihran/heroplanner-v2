import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Toaster } from 'sonner';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { PanelImperativeHandle } from 'react-resizable-panels';
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

  const readySent = useRef(false);
  useEffect(() => {
    if (isTauri && !readySent.current) {
      readySent.current = true;
      invoke('log_frontend_ready');
    }
  }, []);

  // Sync all glow animations to the same phase regardless of mount time
  useEffect(() => {
    const DURATION = 2500;
    const GLOW_CLASSES = ['attuned-glow', 'purple-glow'];
    const sync = (el: Element) => {
      (el as HTMLElement).style.animationDelay = `${-(performance.now() % DURATION)}ms`;
    };
    const syncAll = (root: ParentNode) => {
      root.querySelectorAll(GLOW_CLASSES.map(c => `.${c}`).join(',')).forEach(sync);
    };
    syncAll(document);
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLElement) {
            for (const cls of GLOW_CLASSES) {
              if (node.classList.contains(cls)) { sync(node); break; }
            }
            syncAll(node);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const toggleLeftPanel = useCallback(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
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
        <ResizablePanel
          panelRef={leftPanelRef}
          collapsible
          collapsedSize={0}
          defaultSize={30}
          minSize={20}
          className="overflow-hidden"
          onResize={(size) => setLeftCollapsed(size.asPercentage === 0)}
        >
          <LeftPanel />
        </ResizablePanel>
        <ResizableHandle withHandle collapsed={leftCollapsed} onHandleClick={toggleLeftPanel} />
        <ResizablePanel defaultSize={70} minSize={30}>
          <RightPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default App;
