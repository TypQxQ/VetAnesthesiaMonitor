import { describe, it, expect, beforeEach } from 'vitest';
import { getRangesForProtocol, getSizeGroup } from '../protocols.js';

describe('protocols', () => {
  describe('getSizeGroup', () => {
    it('should return cat for species Cat', () => {
      expect(getSizeGroup('Cat', 5)).toBe('cat');
    });

    it('should return dog_small for small dogs', () => {
      expect(getSizeGroup('Dog', 5)).toBe('dog_small');
    });

    it('should return dog_medium for medium dogs', () => {
      expect(getSizeGroup('Dog', 15)).toBe('dog_medium');
    });

    it('should return dog_large for large dogs', () => {
      expect(getSizeGroup('Dog', 30)).toBe('dog_large');
    });
  });

  describe('getRangesForProtocol', () => {
    it('should return correct ranges for General protocol for a cat', () => {
      const field = 'hr';
      const ranges = getRangesForProtocol('General', 'Cat', 4, field);
      
      // Cat HR in General is [80, 220]
      expect(ranges.warn).toEqual([80, 220]);
      
      // Span is 140, 15% is 21
      // OK range: [80 + 21, 220 - 21] = [101, 199]
      expect(ranges.ok[0]).toBeCloseTo(101);
      expect(ranges.ok[1]).toBeCloseTo(199);
    });

    it('should return null for non-existent field', () => {
      expect(getRangesForProtocol('General', 'Dog', 10, 'invalid_field')).toBe(null);
    });
  });

  describe('getInstructionsForProtocol', () => {
    it('should return correct instructions for Dental protocol', () => {
      const { getInstructionsForProtocol } = require('../protocols.js');
      expect(getInstructionsForProtocol('Dental')).toBe('SpO2 sensor often falls off during dentals.');
    });

    it('should return empty string for General protocol', () => {
      const { getInstructionsForProtocol } = require('../protocols.js');
      expect(getInstructionsForProtocol('General')).toBe('');
    });
  });
});
