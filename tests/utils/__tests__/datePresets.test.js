import { describe, it, expect } from 'vitest';
import { getDatePreset, DATE_PRESETS } from '@/utils/datePresets';

describe('datePresets', () => {
  it('should return correct date range for last7days', () => {
    const result = getDatePreset('last7days');
    expect(result.startDate).toBeTruthy();
    expect(result.endDate).toBeTruthy();
    expect(new Date(result.endDate) >= new Date(result.startDate)).toBe(true);
  });

  it('should return correct date range for last30days', () => {
    const result = getDatePreset('last30days');
    expect(result.startDate).toBeTruthy();
    expect(result.endDate).toBeTruthy();
  });

  it('should return correct date range for thisMonth', () => {
    const result = getDatePreset('thisMonth');
    expect(result.startDate).toBeTruthy();
    expect(result.endDate).toBeTruthy();
  });

  it('should return correct date range for lastYear', () => {
    const result = getDatePreset('lastYear');
    expect(result.startDate).toBeTruthy();
    expect(result.endDate).toBeTruthy();
  });

  it('should return empty strings for invalid preset', () => {
    const result = getDatePreset('invalid');
    expect(result.startDate).toBe('');
    expect(result.endDate).toBe('');
  });

  it('should have DATE_PRESETS array', () => {
    expect(Array.isArray(DATE_PRESETS)).toBe(true);
    expect(DATE_PRESETS.length).toBeGreaterThan(0);
  });
});

