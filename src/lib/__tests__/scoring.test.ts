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

  it('should return overwhelmed when axis1 is low but axis2 is high', () => {
    expect(determineQuadrantType(1, 5)).toBe('overwhelmed');
    expect(determineQuadrantType(2, 4)).toBe('overwhelmed');
    expect(determineQuadrantType(2.5, 4)).toBe('overwhelmed');
  });

  it('should return passive when both axes are low (at or below 3)', () => {
    expect(determineQuadrantType(1, 1)).toBe('passive');
    expect(determineQuadrantType(2, 2)).toBe('passive');
    expect(determineQuadrantType(3, 3)).toBe('passive');
    expect(determineQuadrantType(2.5, 2.5)).toBe('passive');
  });

  it('should use threshold correctly', () => {
    // Default threshold is 3
    expect(determineQuadrantType(3, 3)).toBe('passive'); // 3 is NOT > 3

    // With threshold 2
    expect(determineQuadrantType(3, 3, 2)).toBe('optimal'); // 3 > 2
    expect(determineQuadrantType(2, 2, 2)).toBe('passive'); // 2 is NOT > 2
  });

  it('should handle boundary values correctly', () => {
    // Exactly 3 should be considered low (not high)
    expect(determineQuadrantType(3.01, 3.01)).toBe('optimal');
    expect(determineQuadrantType(3, 3)).toBe('passive');

    // Values just above and below 3
    expect(determineQuadrantType(3.001, 3.001)).toBe('optimal');
    expect(determineQuadrantType(2.999, 2.999)).toBe('passive');
  });
});
