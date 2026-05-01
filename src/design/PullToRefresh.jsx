// PullToRefresh — gesture-driven refresh indicator for scroll containers.
// Listens for touch drag at scrollTop=0, shows a circular spinner that
// rotates as the user pulls, and fires onRefresh() when released past
// threshold.
//
// In-browser pull-to-refresh has caveats: iOS Safari swipes the page itself,
// and Android Chrome has its own native pull-to-refresh. This component
// expects to live inside a scroll container with overscroll-behavior set.
// Capacitor wrap will override the native behavior, so this becomes the
// authoritative refresh affordance there.
//
// Usage:
//   <div style={{ overflowY: 'auto', overscrollBehaviorY: 'contain' }}>
//     <PullToRefresh onRefresh={async () => await refetchData()} />
//     ...content...
//   </div>

import React, { useEffect, useRef, useState } from 'react';
import { P, FN } from './theme';
import { haptics } from './haptics';
import { sound } from './sound';

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, scrollerSelector = '.adn-noise' }) {
  const [pulling, setPulling] = useState(0);   // 0..THRESHOLD+
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const lastFired = useRef(0);

  useEffect(() => {
    const scroller = document.querySelector(scrollerSelector);
    if (!scroller) return;

    let active = false;

    const onTouchStart = (e) => {
      if (scroller.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      active = true;
    };

    const onTouchMove = (e) => {
      if (!active || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPulling(0);
        return;
      }
      // resistance — feels heavy after halfway
      const resisted = dy < THRESHOLD ? dy : THRESHOLD + (dy - THRESHOLD) * 0.4;
      setPulling(resisted);
      if (resisted > THRESHOLD && lastFired.current === 0) {
        lastFired.current = 1;
        haptics.medium();
      }
    };

    const onTouchEnd = async () => {
      if (!active) return;
      active = false;
      const reached = pulling > THRESHOLD;
      lastFired.current = 0;
      if (reached) {
        setRefreshing(true);
        sound.success();
        try { await onRefresh?.(); } catch { /* swallow */ }
        setRefreshing(false);
      }
      setPulling(0);
      startY.current = null;
    };

    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove',  onTouchMove,  { passive: true });
    scroller.addEventListener('touchend',   onTouchEnd);
    scroller.addEventListener('touchcancel', onTouchEnd);

    return () => {
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove',  onTouchMove);
      scroller.removeEventListener('touchend',   onTouchEnd);
      scroller.removeEventListener('touchcancel', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulling, onRefresh, scrollerSelector]);

  const visible = pulling > 8 || refreshing;
  const progress = Math.min(1, pulling / THRESHOLD);
  const rotate = progress * 360;
  const scale = 0.6 + progress * 0.4;

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 'env(safe-area-inset-top, 12px)',
      left: '50%', transform: 'translateX(-50%)',
      zIndex: 50,
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.2s',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(14,16,22,0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(232,213,183,0.15)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: refreshing ? 'scale(1)' : `scale(${scale})`,
        transition: refreshing ? 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" style={{
          transform: `rotate(${refreshing ? 0 : rotate}deg)`,
          animation: refreshing ? 'calcSpin 1s linear infinite' : 'none',
        }}>
          <circle cx="10" cy="10" r="7" fill="none" stroke="rgba(232,213,183,0.15)" strokeWidth="2" />
          <circle
            cx="10" cy="10" r="7"
            fill="none" stroke="#E8D5B7" strokeWidth="2" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 7}
            strokeDashoffset={refreshing ? 0 : (1 - progress) * 2 * Math.PI * 7}
          />
        </svg>
      </div>
    </div>
  );
}
