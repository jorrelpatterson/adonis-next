import React from 'react';

export default function GradText({ children, style = {} }) {
  return (
    <span style={{
      background: "linear-gradient(135deg,#E8D5B7 0%,#D4C4AA 35%,#C0B8A0 60%,#B8C4D0 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      ...style,
    }}>
      {children}
    </span>
  );
}
