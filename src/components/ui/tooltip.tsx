import { useState, useRef, useCallback, useEffect, type ReactElement, cloneElement } from 'react'
import { createPortal } from 'react-dom'

interface TipProps {
  children: ReactElement
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

const DELAY = 300
const OFFSET = 6

/**
 * Portal-based tooltip. Renders at document.body so it escapes all
 * stacking contexts. Positions itself relative to the trigger element.
 */
export function Tip({ children, content, side = 'bottom' }: TipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const triggerRef = useRef<HTMLElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return
      setVisible(true)
    }, DELAY)
  }, [])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setVisible(false)
  }, [])

  // Position after becoming visible (need tipRef dimensions)
  useEffect(() => {
    if (!visible || !triggerRef.current || !tipRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const tip = tipRef.current.getBoundingClientRect()

    let x: number, y: number
    switch (side) {
      case 'top':
        x = rect.left + rect.width / 2 - tip.width / 2
        y = rect.top - tip.height - OFFSET
        break
      case 'bottom':
        x = rect.left + rect.width / 2 - tip.width / 2
        y = rect.bottom + OFFSET
        break
      case 'left':
        x = rect.left - tip.width - OFFSET
        y = rect.top + rect.height / 2 - tip.height / 2
        break
      case 'right':
        x = rect.right + OFFSET
        y = rect.top + rect.height / 2 - tip.height / 2
        break
    }

    // Clamp to viewport
    x = Math.max(4, Math.min(x, window.innerWidth - tip.width - 4))
    y = Math.max(4, Math.min(y, window.innerHeight - tip.height - 4))

    setPos({ x, y })
  }, [visible, side])

  // Clean up timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const childProps = children.props as Record<string, unknown>
  const child = cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e: MouseEvent) => {
      show();
      (childProps.onMouseEnter as ((e: MouseEvent) => void) | undefined)?.(e)
    },
    onMouseLeave: (e: MouseEvent) => {
      hide();
      (childProps.onMouseLeave as ((e: MouseEvent) => void) | undefined)?.(e)
    },
  } as Record<string, unknown>)

  return (
    <>
      {child}
      {visible && createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          className="tip-portal"
          style={{ left: pos.x, top: pos.y }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}
