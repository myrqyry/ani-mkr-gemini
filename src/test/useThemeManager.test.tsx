import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useThemeManager } from '@hooks/useThemeManager';

describe('useThemeManager hook', () => {
    it('should not update custom themes when importing a file with invalid structure', async () => {
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

        await expect(act(async () => {
            await result.current.handleThemeImport(mockEvent);
        })).rejects.toThrow();
    });
});