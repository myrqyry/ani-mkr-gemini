import { renderHook, act } from '@testing-library/react';
import { useThemeManager } from './useThemeManager';
import { describe, it, expect } from 'vitest';

describe('useThemeManager', () => {
  it('should initialize with the default theme', () => {
    const { result } = renderHook(() => useThemeManager());
    expect(result.current.currentTheme).toBe('default');
  });

  it('should change the theme', () => {
    const { result } = renderHook(() => useThemeManager());
    act(() => {
      result.current.setCurrentTheme('rose-pine');
    });
    expect(result.current.currentTheme).toBe('rose-pine');
    expect(localStorage.getItem('ani-mkr-gemini-theme')).toBe('rose-pine');
  });

  it('should handle color changes', () => {
    const { result } = renderHook(() => useThemeManager());
    act(() => {
      result.current.setCurrentTheme('default');
    });
    act(() => {
      result.current.handleColorChange('--color-background', '#000000');
    });
    expect(result.current.customThemes.default).toEqual({ '--color-background': '#000000' });
  });

  it('should reset the theme to defaults', () => {
    const { result } = renderHook(() => useThemeManager());
    act(() => {
      result.current.setCurrentTheme('default');
    });
    act(() => {
      result.current.handleColorChange('--color-background', '#000000');
    });
    act(() => {
      result.current.handleThemeReset();
    });
    expect(result.current.customThemes.default).toBeUndefined();
  });
});
