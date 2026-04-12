import { describe, it, expect, vi } from 'vitest';
import { t } from '../i18n.js';
import { state } from '../state.js';

vi.mock('../state.js', () => {
  const mockState = {
    lang: 'sv',
    get: vi.fn((key) => mockState[key]),
    set: vi.fn((key, val) => { mockState[key] = val; })
  };
  return { state: mockState };
});

describe('i18n', () => {
  it('should return Swedish translation by default', () => {
    expect(t('start_case')).toBe('Starta Narkos');
  });

  it('should return English translation when lang is set to en', () => {
    state.lang = 'en';
    expect(t('start_case')).toBe('Start Case');
  });

  it('should return the key if translation is missing', () => {
    expect(t('non_existent_key')).toBe('non_existent_key');
  });

  it('should handle decimal separator correctly per language', () => {
    state.lang = 'sv';
    expect(t('decimal_sep')).toBe(',');
    state.lang = 'en';
    expect(t('decimal_sep')).toBe('.');
  });
});
