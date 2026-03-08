import { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { cn } from '@/lib/utils';

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof Group>) => (
  <Group
    className={cn('flex h-full w-full data-[panel-group-direction=vertical]:flex-col', className)}
    {...props}
  />
);

const ResizablePanel = Panel;

const ResizableHandle = ({
  withHandle,
  className,
  collapsed,
  onHandleClick,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
  collapsed?: boolean;
  onHandleClick?: () => void;
}) => {
  const separatorRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLDivElement>(null);
  const CollapseIcon = collapsed ? ChevronRight : ChevronLeft;

  // Sync portal chevron position to separator via rAF — no lag during drag
  useEffect(() => {
    if (!withHandle || !onHandleClick) return;
    let raf: number;
    const sync = () => {
      const sep = separatorRef.current;
      const chev = chevronRef.current;
      if (sep && chev) {
        const rect = sep.getBoundingClientRect();
        chev.style.left = `${rect.left + rect.width / 2}px`;
        chev.style.top = `${rect.top + rect.height / 2 + 16}px`;
      }
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [withHandle, onHandleClick]);

  return (
    <>
      <Separator
        elementRef={separatorRef}
        className={cn(
          'group relative flex w-px items-center justify-center bg-border',
          'hover:bg-coh-gradient1/60 hover:w-[3px] hover:shadow-[0_0_0.5rem_rgba(53,123,215,0.3)] transition-all duration-150',
          'after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
          'data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90',
          className
        )}
        {...props}
      >
        {withHandle && (
          <div className="z-10">
            <div
              className={cn(
                'flex h-5 w-4 items-center justify-center rounded-sm cursor-grab active:cursor-grabbing',
                'border border-coh-secondary/50 bg-coh-dark/90 text-white/40',
                'hover:bg-coh-gradient1/20 hover:text-white/70 hover:border-coh-gradient1/50 hover:shadow-[0_0_0.375rem_rgba(53,123,215,0.2)]',
                'transition-all duration-150',
              )}
            >
              <GripVertical className="h-3 w-3" />
            </div>
          </div>
        )}
      </Separator>

      {/* Collapse chevron — rendered outside the Separator DOM so the library's
          capture-phase pointerdown listener can't intercept clicks.
          Position synced to separator via rAF for zero-lag tracking. */}
      {withHandle && onHandleClick && (
        <div ref={chevronRef} className="fixed z-20" style={{ left: -9999, top: -9999 }}>
          <div
            className={cn(
              'flex h-5 w-4 -translate-x-1/2 items-center justify-center rounded-sm cursor-pointer',
              'border border-coh-secondary/50 bg-coh-dark/90 text-white/40',
              'hover:bg-coh-gradient1/30 hover:text-white hover:border-coh-gradient1/60 hover:shadow-[0_0_0.375rem_rgba(53,123,215,0.3)]',
              'transition-all duration-150',
            )}
            onClick={() => onHandleClick()}
          >
            <CollapseIcon className="h-3 w-3" />
          </div>
        </div>
      )}
    </>
  );
};

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
