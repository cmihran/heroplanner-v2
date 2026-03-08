import { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, GripVertical, GripHorizontal } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { cn } from '@/lib/utils';

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof Group>) => (
  <Group
    className={cn('flex h-full w-full', className)}
    {...props}
  />
);

const ResizablePanel = Panel;

const ResizableHandle = ({
  withHandle,
  className,
  collapsed,
  onHandleClick,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
  collapsed?: boolean;
  onHandleClick?: () => void;
  orientation?: 'horizontal' | 'vertical';
}) => {
  const separatorRef = useRef<HTMLDivElement>(null);
  const gripRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLDivElement>(null);
  const isVertical = orientation === 'vertical';

  const CollapseIcon = isVertical
    ? (collapsed ? ChevronUp : ChevronDown)
    : (collapsed ? ChevronRight : ChevronLeft);

  const GripIcon = isVertical ? GripHorizontal : GripVertical;

  // Sync portal grip + chevron position to separator via rAF
  useEffect(() => {
    if (!withHandle) return;
    let raf: number;
    const sync = () => {
      const sep = separatorRef.current;
      const grip = gripRef.current;
      const chev = chevronRef.current;
      if (sep) {
        const rect = sep.getBoundingClientRect();
        // For vertical separators, the separator is only 1px wide in a column flex.
        // Walk up to the Group container (has data-group) to get the true panel width.
        let cx: number, cy: number;
        if (isVertical) {
          const group = sep.closest('[data-group]');
          const groupRect = group ? group.getBoundingClientRect() : rect;
          cx = groupRect.left + groupRect.width / 2;
          cy = rect.top + rect.height / 2;
        } else {
          cx = rect.left + rect.width / 2;
          cy = rect.top + rect.height / 2;
        }
        if (grip) {
          grip.style.left = `${cx}px`;
          grip.style.top = `${cy}px`;
        }
        if (chev) {
          if (isVertical) {
            chev.style.left = `${cx + 42}px`;
            chev.style.top = `${cy}px`;
          } else {
            chev.style.left = `${cx}px`;
            chev.style.top = `${cy + 42}px`;
          }
        }
      }
      raf = requestAnimationFrame(sync);
    };
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, [withHandle, onHandleClick, isVertical]);

  const gripSize = isVertical ? 'h-4 w-5' : 'h-5 w-4';

  return (
    <>
      <Separator
        elementRef={separatorRef}
        className={cn(
          'group relative flex items-center justify-center bg-border',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
          'transition-all duration-150',
          isVertical
            ? 'h-px w-full hover:h-[3px] hover:bg-coh-gradient1/60 hover:shadow-[0_0_0.5rem_rgba(53,123,215,0.3)] after:absolute after:inset-x-0 after:top-1/2 after:h-2 after:-translate-y-1/2'
            : 'w-px hover:w-[3px] hover:bg-coh-gradient1/60 hover:shadow-[0_0_0.5rem_rgba(53,123,215,0.3)] after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2',
          className
        )}
        {...props}
      />

      {/* Grip handle — rendered as a fixed portal so separator layout doesn't affect centering */}
      {withHandle && (
        <div ref={gripRef} className="fixed z-10 pointer-events-none" style={{ left: -9999, top: -9999 }}>
          <div
            className={cn(
              'pointer-events-auto -translate-x-1/2 -translate-y-1/2',
              'flex items-center justify-center rounded-sm cursor-grab active:cursor-grabbing',
              'border border-coh-secondary/50 bg-coh-dark/90 text-white/40',
              'hover:bg-coh-gradient1/20 hover:text-white/70 hover:border-coh-gradient1/50 hover:shadow-[0_0_0.375rem_rgba(53,123,215,0.2)]',
              'transition-all duration-150',
              gripSize,
            )}
          >
            <GripIcon className="h-3 w-3" />
          </div>
        </div>
      )}

      {/* Collapse chevron — rendered outside the Separator DOM so the library's
          capture-phase pointerdown listener can't intercept clicks.
          Position synced to separator via rAF for zero-lag tracking. */}
      {withHandle && onHandleClick && (
        <div ref={chevronRef} className="fixed z-20" style={{ left: -9999, top: -9999 }}>
          <div
            className={cn(
              'flex items-center justify-center rounded-sm cursor-pointer -translate-x-1/2 -translate-y-1/2',
              'border border-coh-secondary/50 bg-coh-dark/90 text-white/40',
              'hover:bg-coh-gradient1/30 hover:text-white hover:border-coh-gradient1/60 hover:shadow-[0_0_0.375rem_rgba(53,123,215,0.3)]',
              'transition-all duration-150',
              gripSize,
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
