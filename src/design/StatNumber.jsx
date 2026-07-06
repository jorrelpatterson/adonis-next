// StatNumber — animated number display with count-up on value change.
//
// Reads tabular-nums for digit alignment and runs a smooth count-up whenever
// the prop changes (e.g. after logging a meal, the calorie remaining ticks
// down rather than snapping). Honors prefers-reduced-motion.
//
// Usage:
//   <StatNumber value={remaining} format={n => Math.round(n).toLocaleString()} />
//   <StatNumber value={205.4} format={n => n.toFixed(1) + ' lbs'} />

import React, { useEffect, useRef, useState } from 'react';
import { countUpTo } from './motion';

export default function StatNumber({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  duration = 700,
  initial = null,    // first-render starting point (defaults to value)
  className = '',
  style,
}) {
  const numericTarget = Number(value);
  const valid = Number.isFinite(numericTarget);
  const initialNumeric = initial != null ? Number(initial) : numericTarget;

  const [display, setDisplay] = useState(valid ? initialNumeric : 0);
  const prevRef = useRef(valid ? initialNumeric : 0);

  useEffect(() => {
    if (!valid) return;
    const cancel = countUpTo({
      from: prevRef.current,
      to: numericTarget,
      duration,
      onUpdate: setDisplay,
    });
    prevRef.current = numericTarget;
    return cancel;
  }, [numericTarget, duration, valid]);

  if (!valid) {
    return <span className={className} style={style}>{value}</span>;
  }

  return (
    <span
      className={className}
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum" 1',
        ...style,
      }}
    >
      {format(display)}
    </span>
  );
}
