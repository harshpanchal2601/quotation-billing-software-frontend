import { describe, expect, it } from 'vitest';
import { formatExactDecimal, formatTimestamp } from './presentation';
describe('exact localized financial presentation', () => {
  it('preserves high precision and negative fractional values', () => {
    expect(formatExactDecimal('9007199254740993.123', 'en-US')).toBe('9,007,199,254,740,993.123');
    expect(formatExactDecimal('1000000.000001', 'hi-IN')).toBe('10,00,000.000001');
    expect(formatExactDecimal('-0.001', 'gu-IN')).toBe('-0.001');
  });
  it('converts only timestamp presentation and leaves input intact', () => {
    const value = '2026-11-09T00:30:00Z';
    expect(formatTimestamp(value, { language: 'en', locale: 'en-US', timezone: 'America/Los_Angeles' })).toContain('Nov 8, 2026');
    expect(value).toBe('2026-11-09T00:30:00Z');
  });
  it('pads display decimals without rounding or reducing source precision', () => {
    expect(formatExactDecimal('9007199254740993.1', 'en-IN', 2)).toBe('9,00,71,99,25,47,40,993.10');
    expect(formatExactDecimal('-0.1', 'en-IN', 2)).toBe('-0.10');
    expect(formatExactDecimal('10', 'en-US', 3)).toBe('10.000');
    expect(formatExactDecimal('10.123456', 'en-US', 2)).toBe('10.123456');
    expect(formatExactDecimal('10', 'en-US')).toBe('10');
  });
});
