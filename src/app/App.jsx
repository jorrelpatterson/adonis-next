// src/app/App.jsx
import React from 'react';

export default function App() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", background: "#060709", color: "#F5F5F7", position: "fixed", inset: 0 }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 300, fontStyle: "italic", fontSize: 32, color: "#E8D5B7" }}>
          Adonis
        </h1>
        <p style={{ color: "#5C6070", fontSize: 13 }}>v2 Shell — Foundation loaded</p>
      </div>
    </div>
  );
}
