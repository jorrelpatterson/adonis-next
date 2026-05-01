import { describe, it, expect } from 'vitest';
import { blockForTask, groupTasksByTimeBlock, TIME_BLOCKS } from '../group-by-time.js';

describe('blockForTask', () => {
  it('uses task.time HH:MM to determine block', () => {
    expect(blockForTask({ time: '07:30' })).toBe('morning');
    expect(blockForTask({ time: '12:30' })).toBe('midday');
    expect(blockForTask({ time: '15:00' })).toBe('afternoon');
    expect(blockForTask({ time: '20:00' })).toBe('evening');
    expect(blockForTask({ time: '23:30' })).toBe('night');
  });

  it('uses tod string when no time', () => {
    expect(blockForTask({ tod: 'morning' })).toBe('morning');
    expect(blockForTask({ tod: 'evening' })).toBe('evening');
    expect(blockForTask({ data: { peptide: { tod: 'morning' } } })).toBe('morning');
  });

  it('uses category fallback', () => {
    expect(blockForTask({ category: 'training' })).toBe('afternoon');
    expect(blockForTask({ category: 'morning' })).toBe('morning');
    expect(blockForTask({ category: 'evening' })).toBe('evening');
  });

  it('defaults to morning when no signal', () => {
    expect(blockForTask({})).toBe('morning');
    expect(blockForTask({ category: 'unknown' })).toBe('morning');
  });
});

describe('groupTasksByTimeBlock', () => {
  it('returns empty for empty input', () => {
    expect(groupTasksByTimeBlock([])).toEqual([]);
    expect(groupTasksByTimeBlock(null)).toEqual([]);
  });

  it('puts each task in the right block', () => {
    const tasks = [
      { id: 'a', time: '07:00', category: 'morning' },
      { id: 'b', time: '13:00', category: 'nutrition' },
      { id: 'c', time: '20:00', category: 'evening' },
    ];
    const out = groupTasksByTimeBlock(tasks);
    const blocks = out.map(b => b.block);
    expect(blocks).toEqual(['morning', 'midday', 'evening']);
  });

  it('collapses 2+ training tasks into one group', () => {
    const tasks = [
      { id: 'workout', title: 'Push Day', category: 'training', duration: 60 },
      { id: 'ex1', title: 'Bench Press', category: 'training' },
      { id: 'ex2', title: 'Overhead Press', category: 'training' },
    ];
    const out = groupTasksByTimeBlock(tasks);
    const block = out[0];  // afternoon (training default)
    expect(block.items.length).toBe(1);
    expect(block.items[0].kind).toBe('group');
    expect(block.items[0].category).toBe('training');
    expect(block.items[0].tasks.length).toBe(3);
  });

  it('does NOT collapse single-item categories', () => {
    const tasks = [
      { id: 'workout', title: 'Push Day', category: 'training' },  // alone
      { id: 'lunch',   title: 'Lunch',    category: 'nutrition', time: '12:00' },
    ];
    const out = groupTasksByTimeBlock(tasks);
    // Both render as kind: 'task'
    const allTasks = out.flatMap(b => b.items);
    expect(allTasks.every(i => i.kind === 'task')).toBe(true);
  });

  it('groups peptides separately by time block', () => {
    const tasks = [
      { id: 'p1', title: 'Semax', category: 'peptide', tod: 'morning' },
      { id: 'p2', title: 'Selank', category: 'peptide', tod: 'morning' },
      { id: 'p3', title: 'DSIP', category: 'peptide', tod: 'evening' },
      { id: 'p4', title: 'CJC/Ipa', category: 'peptide', tod: 'evening' },
    ];
    const out = groupTasksByTimeBlock(tasks);
    const morning = out.find(b => b.block === 'morning');
    const evening = out.find(b => b.block === 'evening');
    expect(morning.items.length).toBe(1);
    expect(morning.items[0].kind).toBe('group');
    expect(morning.items[0].tasks.length).toBe(2);
    expect(evening.items.length).toBe(1);
    expect(evening.items[0].tasks.length).toBe(2);
  });

  it('preserves block order: morning → night', () => {
    const tasks = [
      { id: 'a', time: '23:00' },
      { id: 'b', time: '07:00' },
      { id: 'c', time: '20:00' },
    ];
    const out = groupTasksByTimeBlock(tasks);
    expect(out.map(b => b.block)).toEqual(['morning', 'evening', 'night']);
  });
});
