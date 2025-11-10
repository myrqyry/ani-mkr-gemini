import React, { useRef } from 'react';
import { Theme } from '@types/types';
import { THEMES, EDITABLE_THEME_PROPERTIES, THEME_PALETTES } from '@constants/theme';
import { XCircleIcon, UploadIcon, DownloadIcon } from '@components/icons';

interface ThemeCustomizerProps {
  /** The current theme. */
  theme: Theme;
  /** An object with the custom colors for the current theme. */
  customColors: Partial<Record<string, string>>;
  /** Callback to change a custom color. */
  onColorChange: (cssVar: string, value: string) => void;
  /** Callback to reset the theme to its default colors. */
  onReset: () => void;
  /** Callback to import a theme from a JSON file. */
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Callback to export the custom themes to a JSON file. */
  onExport: () => void;
  /** Callback to close the theme customizer. */
  onClose: () => void;
}

/**
 * A modal component that allows the user to customize the colors of the current theme.
 * @param {ThemeCustomizerProps} props The component props.
 * @returns {JSX.Element} The rendered component.
 */
const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ theme, customColors, onColorChange, onReset, onImport, onExport, onClose }) => {
    const importInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[var(--color-surface)] w-full max-w-md rounded-lg shadow-2xl border border-[var(--color-surface-alt)]">
                <div className="p-4 border-b border-[var(--color-surface-alt)] flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Customize '{THEMES.find(t => t.id === theme)?.name}'</h2>
                    <button onClick={onClose} aria-label="Close customizer">
                        <XCircleIcon className="w-6 h-6 text-[var(--color-text-muted)] hover:text-[var(--color-text-base)]"/>
                    </button>
                </div>
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <h3 className="text-md font-medium text-[var(--color-text-muted)] mb-2">Editable Colors</h3>
                        <div className="space-y-3">
                            {EDITABLE_THEME_PROPERTIES.map(({ cssVar, label }) => {
                                const currentColor = customColors[cssVar] || getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
                                return (
                                <div key={cssVar} className="flex items-center justify-between">
                                    <label htmlFor={cssVar} className="text-sm">{label}</label>
                                    <div className="flex items-center gap-x-2">
                                        <span className="text-sm text-[var(--color-text-muted)]">{currentColor}</span>
                                        <input
                                            id={cssVar}
                                            type="color"
                                            value={currentColor}
                                            onChange={(e) => onColorChange(cssVar, e.target.value)}
                                            className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent appearance-none"
                                            style={{backgroundColor: 'transparent'}}
                                        />
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-md font-medium text-[var(--color-text-muted)] mb-2">Full Theme Palette</h3>
                        <p className="text-xs text-[var(--color-text-subtle)] mb-3">Click a swatch to apply it to an editable color above.</p>
                        <div className="flex flex-wrap gap-2">
                            {THEME_PALETTES[theme].map(({ name, hex }) => (
                                <div key={name} className="text-center">
                                    <div
                                        className="w-10 h-10 rounded-md border border-white/20"
                                        style={{ backgroundColor: hex }}
                                    ></div>
                                    <p className="text-xs mt-1 text-[var(--color-text-muted)]">{name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-[var(--color-surface-alt)] flex flex-wrap justify-between items-center gap-2">
                     <div className="flex gap-2">
                        <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-x-2 text-sm bg-[var(--color-button)] px-3 py-1.5 rounded-md hover:bg-[var(--color-button-hover)] transition-colors">
                            <UploadIcon className="w-4 h-4" /> Import
                        </button>
                        <button onClick={onExport} className="flex items-center gap-x-2 text-sm bg-[var(--color-button)] px-3 py-1.5 rounded-md hover:bg-[var(--color-button-hover)] transition-colors">
                            <DownloadIcon className="w-4 h-4" /> Export
                        </button>
                        <input type="file" ref={importInputRef} onChange={onImport} accept=".json" className="hidden" />
                    </div>
                    <button onClick={onReset} className="text-sm bg-[var(--color-danger-surface)] text-[var(--color-danger-text)] px-3 py-1.5 rounded-md hover:opacity-80 transition-opacity">
                        Reset to Defaults
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThemeCustomizer;