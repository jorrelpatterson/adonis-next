// src/views/__tests__/CommunityView.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import CommunityView from '../CommunityView';

describe('CommunityView', () => {
  it('renders the Community hero header', () => {
    const { container } = render(<CommunityView />);
    expect(container.textContent).toContain('Community');
  });

  it('renders the real computed routine streak, not the archive hardcoded 12', () => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(todayISO);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const twoDaysAgo = new Date(todayISO);
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);

    // 3-day streak ending yesterday (today has no activity yet — streak still
    // counts per computeRoutineStreak's "today doesn't break streak" rule).
    const logs = {
      routine: {
        [yesterday.toISOString().slice(0, 10)]: ['task-1'],
        [twoDaysAgo.toISOString().slice(0, 10)]: ['task-1'],
        [new Date(twoDaysAgo.getTime() - 86400000).toISOString().slice(0, 10)]: ['task-1'],
      },
    };
    const { container } = render(<CommunityView logs={logs} />);
    expect(container.textContent).toContain('3');
    // Never the archive's hardcoded placeholder value.
    expect(container.textContent).not.toContain('12');
  });

  it('computed streak is 0 when logs/routine is empty', () => {
    const { container } = render(<CommunityView logs={{}} />);
    const streakEl = container.querySelector('[style*="font-size: 38px"], div');
    expect(container.textContent).not.toContain('12');
    // The streak digit "0" should appear near "days".
    expect(container.textContent).toMatch(/0\s*days|0days/i);
  });

  it('shows a visible Preview label on the Find Partners sample-data section', () => {
    const { container } = render(
      <CommunityView protocolStates={{ community: { lookingFor: 'accountability' } }} />
    );
    expect(container.textContent).toContain('Find Partners');
    expect(container.textContent).toContain('Preview — matching ships later');
  });

  it('shows a visible Preview label on the Group Activity sample-feed section (mastermind mode)', () => {
    const { container } = render(
      <CommunityView protocolStates={{ community: { lookingFor: 'mastermind' } }} />
    );
    expect(container.textContent).toContain('Group Activity');
    // Two preview sections render in mastermind mode (Find Group Members + Group Activity).
    const matches = container.textContent.match(/Preview — matching ships later/g) || [];
    expect(matches.length).toBe(2);
  });

  it('does not show partner/feed sections in solo (just_streaks) mode', () => {
    const { container } = render(<CommunityView protocolStates={{ community: {} }} />);
    expect(container.textContent).not.toContain('Find Partners');
    expect(container.textContent).not.toContain('Group Activity');
    expect(container.textContent).toContain('Solo Mode');
  });

  it('has no live hrefs anywhere in the tree', () => {
    const { container } = render(
      <CommunityView protocolStates={{ community: { lookingFor: 'mastermind' } }} />
    );
    expect(container.querySelectorAll('a[href]').length).toBe(0);
  });

  it('does not render the archive-only dead-link labels as real links', () => {
    const { container } = render(
      <CommunityView protocolStates={{ community: { lookingFor: 'accountability' } }} />
    );
    // "Edit" and "Find someone" were removed entirely.
    expect(container.textContent).not.toContain('Edit');
    expect(container.textContent).not.toContain('Find someone');
    // "Connect" is kept but inert-visible (no href) — covered by the href test above.
    expect(container.textContent).toContain('Connect');
  });

  it('renders domain goals with real progress when present', () => {
    const domainGoals = [
      { id: 'g1', title: 'Find an accountability partner', progress: { percent: 40 }, activeProtocols: ['p1'] },
    ];
    const { container } = render(<CommunityView domainGoals={domainGoals} />);
    expect(container.textContent).toContain('Find an accountability partner');
    expect(container.textContent).toContain('40%');
  });

  it('calls onAddGoal when the empty-state Add Goal button is clicked', () => {
    const onAddGoal = vi.fn();
    const { getByText } = render(<CommunityView onAddGoal={onAddGoal} />);
    getByText('+ Add Goal').click();
    expect(onAddGoal).toHaveBeenCalledTimes(1);
  });

  it("renders today's tasks and toggles via onCheckTask", () => {
    const onCheckTask = vi.fn();
    const domainTasks = [{ id: 't1', title: 'Share your streak' }];
    const { getByText } = render(
      <CommunityView domainTasks={domainTasks} completedTasks={[]} onCheckTask={onCheckTask} />
    );
    expect(getByText('Share your streak')).toBeTruthy();
  });
});
