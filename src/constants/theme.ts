import { Theme } from '../types/types';

/**
 * The available themes.
 */
export const THEMES: { id: Theme; name: string }[] = [
  { id: 'default', name: 'Default' },
  { id: 'rose-pine', name: 'Rosé Pine' },
  { id: 'catppuccin', name: 'Catppuccin' },
];

/**
 * The editable theme properties.
 */
export const EDITABLE_THEME_PROPERTIES = [
  { cssVar: '--color-background', label: 'Background' },
  { cssVar: '--color-surface', label: 'Surface' },
  { cssVar: '--color-overlay', label: 'Overlay' },
  { cssVar: '--color-accent', label: 'Accent' },
  { cssVar: '--color-text-base', label: 'Text' },
  { cssVar: '--color-danger', label: 'Danger' },
];

/**
 * The theme palettes.
 */
export const THEME_PALETTES: Record<Theme, { name: string; hex: string }[]> = {
  default: [
    { name: 'Black', hex: '#000000' },
    { name: 'Gray 900', hex: '#111827' },
    { name: 'Gray 700', hex: '#374151' },
    { name: 'Gray 600', hex: '#4b5563' },
    { name: 'Gray 400', hex: '#9ca3af' },
    { name: 'Gray 100', hex: '#f3f4f6' },
    { name: 'Indigo 600', hex: '#4f46e5' },
    { name: 'Indigo 500', hex: '#6366f1' },
    { name: 'Rose 700', hex: '#be123c' },
    { name: 'Yellow 400', hex: '#facc15' },
    { name: 'Green 600', hex: '#16a34a' },
    { name: 'Blue 600', hex: '#2563eb' },
    { name: 'Violet 500', hex: '#8b5cf6' },
  ],
  'rose-pine': [
    { name: 'Base', hex: '#191724' },
    { name: 'Surface', hex: '#1f1d2e' },
    { name: 'Overlay', hex: '#26233a' },
    { name: 'Muted', hex: '#6e6a86' },
    { name: 'Subtle', hex: '#908caa' },
    { name: 'Text', hex: '#e0def4' },
    { name: 'Love', hex: '#eb6f92' },
    { name: 'Gold', hex: '#f6c177' },
    { name: 'Rose', hex: '#ebbcba' },
    { name: 'Pine', hex: '#31748f' },
    { name: 'Foam', hex: '#9ccfd8' },
    { name: 'Iris', hex: '#c4a7e7' },
    { name: 'Highlight Low', hex: '#21202e' },
    { name: 'Highlight Med', hex: '#403d52' },
    { name: 'Highlight High', hex: '#524f67' },
  ],
  catppuccin: [
    { name: 'Rosewater', hex: '#f5e0dc' },
    { name: 'Flamingo', hex: '#f2cdcd' },
    { name: 'Pink', hex: '#f5c2e7' },
    { name: 'Mauve', hex: '#cba6f7' },
    { name: 'Red', hex: '#f38ba8' },
    { name: 'Maroon', hex: '#eba0ac' },
    { name: 'Peach', hex: '#fab387' },
    { name: 'Yellow', hex: '#f9e2af' },
    { name: 'Green', hex: '#a6e3a1' },
    { name: 'Teal', hex: '#94e2d5' },
    { name: 'Sky', hex: '#89dceb' },
    { name: 'Sapphire', hex: '#74c7ec' },
    { name: 'Blue', hex: '#89b4fa' },
    { name: 'Lavender', hex: '#b4befe' },
    { name: 'Text', hex: '#cdd6f4' },
    { name: 'Subtext1', hex: '#bac2de' },
    { name: 'Subtext0', hex: '#a6adc8' },
    { name: 'Overlay2', hex: '#9399b2' },
    { name: 'Overlay1', hex: '#7f849c' },
    { name: 'Overlay0', hex: '#6c7086' },
    { name: 'Surface2', hex: '#585b70' },
    { name: 'Surface1', hex: '#45475a' },
    { name: 'Surface0', hex: '#313244' },
    { name: 'Base', hex: '#1e1e2e' },
    { name: 'Mantle', hex: '#181825' },
    { name: 'Crust', hex: '#11111b' },
  ],
};