// @vitest-environment node
// src/design/__tests__/components.test.jsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GradText, H } from '../components';

describe('GradText', () => {
  it('renders children with gradient text style', () => {
    const html = renderToStaticMarkup(<GradText>Hello</GradText>);
    expect(html).toContain('Hello');
    expect(html).toContain('linear-gradient');
  });
});

describe('H (section header)', () => {
  it('renders title', () => {
    const html = renderToStaticMarkup(<H t="My Title" />);
    expect(html).toContain('My Title');
  });

  it('renders subtitle when provided', () => {
    const html = renderToStaticMarkup(<H t="Title" sub="Subtitle" />);
    expect(html).toContain('Subtitle');
  });

  it('omits subtitle when not provided', () => {
    const html = renderToStaticMarkup(<H t="Title" />);
    expect(html).not.toContain('<p');
  });
});
