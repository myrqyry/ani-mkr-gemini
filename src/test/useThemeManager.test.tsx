import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useThemeManager } from 'src/hooks/useThemeManager';

describe('useThemeManager hook', () => {
    it('should not update custom themes when importing a file with invalid structure', () => {
        const { result } = renderHook(() => useThemeManager());

        const invalidThemes = {
            'default': {
                '--color-background': 123, // Invalid type
            },
        };

        const invalidFile = new File([JSON.stringify(invalidThemes)], 'invalid-themes.json', { type: 'application/json' });
        const mockEvent = {
            target: {
                files: [invalidFile],
                value: '',
            },
        } as unknown as React.ChangeEvent<HTMLInputElement>;

        expect(() => {
            act(() => {
                result.current.handleThemeImport(mockEvent);
            });
        }).toThrow();
    });
});