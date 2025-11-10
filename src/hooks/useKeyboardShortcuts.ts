// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
  disabled?: boolean;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach(({ key, ctrlKey, shiftKey, altKey, callback, disabled }) => {
        if (disabled) return;

        const matchesKey = event.key.toLowerCase() === key.toLowerCase();
        const matchesCtrl = ctrlKey === undefined || event.ctrlKey === ctrlKey;
        const matchesShift = shiftKey === undefined || event.shiftKey === shiftKey;
        const matchesAlt = altKey === undefined || event.altKey === altKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
          event.preventDefault();
          callback();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};
