// useLongPress — hook returning event handlers that fire onLongPress() after
// a hold (default 500ms). Cancels on move/end/leave. Fires haptics.medium()
// on trigger so the user feels the long-press register.
//
// Usage:
//   const handlers = useLongPress(() => openMenu(), { delay: 450 });
//   <div {...handlers}>...</div>

import { useCallback, useRef } from 'react';
import { haptics } from './haptics';

export function useLongPress(callback, { delay = 500, threshold = 8 } = {}) {
  const timer = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const fired = useRef(false);

  const start = useCallback((e) => {
    fired.current = false;
    const touch = e.touches?.[0];
    startPos.current = touch ? { x: touch.clientX, y: touch.clientY } : { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => {
      fired.current = true;
      haptics.medium();
      callback(e);
    }, delay);
  }, [callback, delay]);

  const move = useCallback((e) => {
    const touch = e.touches?.[0];
    const x = touch ? touch.clientX : e.clientX;
    const y = touch ? touch.clientY : e.clientY;
    const dx = Math.abs(x - startPos.current.x);
    const dy = Math.abs(y - startPos.current.y);
    if (dx > threshold || dy > threshold) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    }
  }, [threshold]);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const onClickCapture = useCallback((e) => {
    // If long-press already fired, suppress the click.
    if (fired.current) {
      e.preventDefault();
      e.stopPropagation();
      fired.current = false;
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onContextMenu: (e) => e.preventDefault(),
    onClickCapture,
  };
}
