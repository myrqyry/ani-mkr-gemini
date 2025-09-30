/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum AppState {
  Capturing,
  Processing,
  Animating,
  Error,
}

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Theme = 'default' | 'rose-pine' | 'catppuccin';

export type CustomThemes = Partial<Record<Theme, Partial<Record<string, string>>>>;

export interface ImageState {
  original: string | null;
  style: string | null;
  motion: string | null;
}
