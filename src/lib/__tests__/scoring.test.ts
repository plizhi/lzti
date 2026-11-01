import { describe, it, expect } from 'vitest';
import { determineQuadrantType } from '@/lib/scoring/calculator';

describe('determineQuadrantType', () => {
  it('should return optimal when both axes are high (above 3)', () => {
    expect(determineQuadrantType(5, 5)).toBe('optimal');
    expect(determineQuadrantType(4, 4)).toBe('optimal');
    expect(determineQuadrantType(4.5, 3.5)).toBe('optimal');
  });

  it('should return strategy when axis1 is high but axis2 is low', () => {
    expect(determineQuadrantType(5, 1)).toBe('strategy');
    expect(determineQuadrantType(4, 2)).toBe('strategy');
    expect(determineQuadrantType(4, 2.5)).toBe('strategy');
  });

  // 约定 Q（2026-11-01）：纵低横高 = passive（灰 / medium），纵低横低 = overwhelmed（红 / critical）
  it('should return passive when axis1 is low but axis2 is high', () => {
    expect(determineQuadrantType(1, 5)).toBe('passive');
    expect(determineQuadrantType(2, 4)).toBe('passive');
    expect(determineQuadrantType(2.5, 4)).toBe('passive');
  });

  it('should return overwhelmed when both axes are low (at or below 3)', () => {
    expect(determineQuadrantType(1, 1)).toBe('overwhelmed');
    expect(determineQuadrantType(2, 2)).toBe('overwhelmed');
    expect(determineQuadrantType(3, 3)).toBe('overwhelmed');
    expect(determineQuadrantType(2.5, 2.5)).toBe('overwhelmed');
  });

  it('should use threshold correctly', () => {
    // Default threshold is 3
    expect(determineQuadrantType(3, 3)).toBe('overwhelmed'); // 3 is NOT > 3

    // With threshold 2
    expect(determineQuadrantType(3, 3, 2)).toBe('optimal'); // 3 > 2
    expect(determineQuadrantType(2, 2, 2)).toBe('overwhelmed'); // 2 is NOT > 2
  });

  it('should handle boundary values correctly', () => {
    // Exactly 3 should be considered low (not high)
    expect(determineQuadrantType(3.01, 3.01)).toBe('optimal');
    expect(determineQuadrantType(3, 3)).toBe('overwhelmed');

    // Values just above and below 3
    expect(determineQuadrantType(3.001, 3.001)).toBe('optimal');
    expect(determineQuadrantType(2.999, 2.999)).toBe('overwhelmed');
  });
});
