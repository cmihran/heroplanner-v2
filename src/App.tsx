import { useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Header } from '@/components/planner/Header';
import { LeftPanel } from '@/components/planner/LeftPanel';
import { RightPanel } from '@/components/planner/RightPanel';
import { useHeroStore } from '@/stores/heroStore';

function App() {
  const loadInitialData = useHeroStore((s) => s.loadInitialData);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return (
    <div className="h-screen flex flex-col bg-coh-primary text-foreground overflow-hidden">
      <Header />
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
