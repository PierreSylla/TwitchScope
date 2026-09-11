import { describe, expect, it } from 'vitest';
import { formatDuration, formatViewerCount } from './format';

describe('formatDuration', () => {
  const now = new Date('2026-01-01T02:34:00Z').getTime();

  it('formats under an hour as minutes only', () => {
    expect(formatDuration('2026-01-01T02:00:00Z', now)).toBe('34m');
  });

  it('formats over an hour as hours and minutes', () => {
    expect(formatDuration('2026-01-01T00:00:00Z', now)).toBe('2h 34m');
  });

  it('never goes negative for a clock-skewed start time', () => {
    expect(formatDuration('2026-01-01T03:00:00Z', now)).toBe('0m');
  });
});

describe('formatViewerCount', () => {
  it('adds thousands separators for the given locale', () => {
    expect(formatViewerCount(12345, 'en')).toBe('12,345');
  });
});
