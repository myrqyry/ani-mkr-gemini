import React from 'react';
import { Theme } from '../../../types/types';
import { THEMES } from '../../../constants/theme';
import { PaletteIcon } from '../../icons';

interface ThemeSwitcherProps {
  /** The current theme. */
  currentTheme: Theme;
  /** Callback to change the theme. */
  onThemeChange: (theme: Theme) => void;
  /** Callback to open the theme customizer. */
  onCustomize: () => void;
}

/**
 * A component that allows the user to switch between themes and open the theme customizer.
 * @param {ThemeSwitcherProps} props The component props.
 * @returns {JSX.Element} The rendered component.
 */
const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, onThemeChange, onCustomize }) => {
    return (
        <div className="flex items-center gap-x-2">
            <span className="text-sm">Theme:</span>
            <div className="flex items-center bg-[var(--color-surface)] rounded-md p-1">
                {THEMES.map(theme => (
                    <button
                        key={theme.id}
                        onClick={() => onThemeChange(theme.id)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                            currentTheme === theme.id
                                ? 'bg-[var(--color-accent)] text-white'
                                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-button-hover)]'
                        }`}
                    >
                        {theme.name}
                    </button>
                ))}
            </div>
            <button onClick={onCustomize} aria-label="Customize theme" className="p-1.5 bg-[var(--color-surface)] rounded-md hover:bg-[var(--color-button-hover)] transition-colors">
                <PaletteIcon className="w-4 h-4"/>
            </button>
        </div>
    );
};

export default ThemeSwitcher;