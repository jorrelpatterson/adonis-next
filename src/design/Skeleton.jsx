// Skeleton — shimmering placeholders rendered while data loads.
// Use in place of every spinner. Keeps the layout solid so content
// doesn't jump in.

import React from 'react';

export function SkelLine({ w = '100%', h = 14, mt = 0 }) {
  return (
    <div className="adn-skel" style={{
      width: w, height: h, marginTop: mt, borderRadius: h / 2,
    }} />
  );
}

export function SkelCircle({ size = 40, mt = 0 }) {
  return (
    <div className="adn-skel" style={{
      width: size, height: size, marginTop: mt, borderRadius: '50%',
    }} />
  );
}

export function SkelCard({ height = 80 }) {
  return (
    <div className="adn-skel" style={{
      width: '100%', height, borderRadius: 14, marginBottom: 12,
    }} />
  );
}

// Routine-shaped skeleton — used during initial app boot before logs load.
export function SkelRoutine() {
  return (
    <div style={{ padding: '8px 0' }}>
      {/* Greeting + ring shape */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, paddingTop: 4 }}>
          <SkelLine w="40%" h={9} />
          <SkelLine w="55%" h={28} mt={6} />
          <SkelLine w="70%" h={9} mt={8} />
        </div>
        <SkelCircle size={96} />
      </div>
      <SkelCard height={70} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <SkelCard height={88} />
        <SkelCard height={88} />
        <SkelCard height={88} />
      </div>
      <SkelCard height={120} />
      <SkelCard height={140} />
    </div>
  );
}
