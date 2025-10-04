import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnimationCreator } from './useAnimationCreator';
import * as geminiService from '../services/geminiService';
import * as imageUtils from '../utils/image';
import { AppStatus } from '../types/types';

vi.mock('../services/geminiService');
vi.mock('../utils/image');

describe('useAnimationCreator', () => {
  it('should create an animation', async () => {
    const setAppState = vi.fn();
    const setLoadingMessage = vi.fn();
    const setError = vi.fn();
    const setAnimationAssets = vi.fn();
    const setStoryPrompt = vi.fn();

    vi.mocked(geminiService.generateAnimationAssets).mockResolvedValue({
      imageData: { data: 'mock_image_data', mimeType: 'image/jpeg' },
      frames: [],
      frameDuration: 100,
    });
    vi.mocked(imageUtils.resizeImage).mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,mock_image_data',
      mime: 'image/jpeg',
    });

    const { result } = renderHook(() => useAnimationCreator(
      { original: 'test_image', style: null, motion: null },
      'test prompt',
      9,
      0.7, // styleIntensity
      setAppState,
      setLoadingMessage,
      setError,
      setAnimationAssets,
      setStoryPrompt,
    ));

    await act(async () => {
      await result.current.handleCreateAnimation();
    });

    expect(setAppState).toHaveBeenCalledWith(AppStatus.Processing);
    expect(setLoadingMessage).toHaveBeenCalledWith('Generating sprite sheet...');
    expect(setError).toHaveBeenCalledWith(null);
    expect(setAnimationAssets).toHaveBeenCalled();
    expect(setAppState).toHaveBeenCalledWith(AppStatus.Animating);
  });
});