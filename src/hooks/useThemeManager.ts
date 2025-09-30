import { useState, useEffect } from 'react';
import { Theme, CustomThemes } from '../types/types';
import { THEMES, EDITABLE_THEME_PROPERTIES } from '../constants/theme';

/**
 * Manages the application's theme, including theme switching, custom colors, and import/export functionality.
 * @returns An object with the current theme, custom themes, and functions to manage them.
 */
export const useThemeManager = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('default');
  const [customThemes, setCustomThemes] = useState<CustomThemes>({});
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem('bananimate-theme') as Theme | null;
    if (storedTheme && THEMES.some(t => t.id === storedTheme)) {
      setCurrentTheme(storedTheme);
    }
    try {
      const storedCustoms = localStorage.getItem('bananimate-custom-themes');
      if (storedCustoms) {
        setCustomThemes(JSON.parse(storedCustoms));
      }
    } catch (e) {
      console.error('Failed to parse custom themes from localStorage', e);
    }
  }, []);

  useEffect(() => {
    document.body.dataset.theme = currentTheme;
    localStorage.setItem('bananimate-theme', currentTheme);

    EDITABLE_THEME_PROPERTIES.forEach(prop => {
      document.documentElement.style.removeProperty(prop.cssVar);
    });

    const customs = customThemes[currentTheme] || {};
    Object.entries(customs).forEach(([cssVar, value]) => {
      if (value) {
        document.documentElement.style.setProperty(cssVar, value);
      }
    });
  }, [currentTheme, customThemes]);

  /**
   * Handles changes to a theme's custom colors.
   * @param cssVar The CSS variable to change.
   * @param value The new color value.
   */
  const handleColorChange = (cssVar: string, value: string) => {
    setCustomThemes(prev => {
      const newCustoms = {
        ...prev,
        [currentTheme]: {
          ...(prev[currentTheme] || {}),
          [cssVar]: value,
        },
      };
      localStorage.setItem('bananimate-custom-themes', JSON.stringify(newCustoms));
      return newCustoms;
    });
  };

  /**
   * Resets the current theme to its default colors.
   */
  const handleThemeReset = () => {
    setCustomThemes(prev => {
      const newCustoms = { ...prev };
      delete newCustoms[currentTheme];
      localStorage.setItem('bananimate-custom-themes', JSON.stringify(newCustoms));
      return newCustoms;
    });
  };

  /**
   * Exports the custom themes to a JSON file.
   */
  const handleThemeExport = () => {
    try {
      const jsonString = JSON.stringify(customThemes, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bananimate-themes.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export themes:', e);
      setError('Could not export theme file.');
    }
  };

  /**
   * Imports custom themes from a JSON file.
   * @param e The change event from the file input.
   */
  const handleThemeImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') throw new Error('File could not be read as text.');
        const importedThemes = JSON.parse(result);

        if (typeof importedThemes !== 'object' || importedThemes === null) {
          throw new Error('Imported file is not a valid JSON object.');
        }

        setCustomThemes(prev => {
          const newCustoms = { ...prev, ...importedThemes };
          localStorage.setItem('bananimate-custom-themes', JSON.stringify(newCustoms));
          return newCustoms;
        });
        setIsCustomizerOpen(false);
      } catch (err) {
        console.error('Failed to import themes:', err);
        setError(err instanceof Error ? `Import Error: ${err.message}` : 'Failed to import theme file.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read the selected theme file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return {
    currentTheme,
    customThemes,
    isCustomizerOpen,
    error,
    setCurrentTheme,
    setIsCustomizerOpen,
    handleColorChange,
    handleThemeReset,
    handleThemeExport,
    handleThemeImport,
  };
};