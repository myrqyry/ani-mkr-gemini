import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePostProcessing } from './usePostProcessing';
import * as geminiService from '../services/geminiService';
import * as imageUtils from '../utils/image';
import { AppStatus } from '../types/types';

vi.mock('../services/geminiService');
vi.mock('../utils/image');

describe('usePostProcessing', () => {
  it('should post-process an animation', async () => {
    const setAppState = vi.fn();
    const setLoadingMessage = vi.fn();
    const setError = vi.fn();
    const setAnimationAssets = vi.fn();

    vi.mocked(geminiService.postProcessAnimation).mockResolvedValue({
      imageData: { data: 'mock_image_data', mimeType: 'image/jpeg' },
      frameDuration: 100,
    });
    vi.mocked(imageUtils.resizeImage).mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,mock_image_data',
      mime: 'image/jpeg',
    });

    const { result } = renderHook(() => usePostProcessing(
      { imageData: { data: 'mock_image_data', mimeType: 'image/jpeg' }, frameDuration: 100 },
      { original: null, style: 'test_style_image', motion: null },
      9,
      100,
      0.9,
      setAppState,
      setLoadingMessage,
      setError,
      setAnimationAssets,
    ));

    await act(async () => {
      await result.current.handlePostProcess('apply-style');
    });

    expect(setAppState).toHaveBeenCalledWith(AppStatus.Processing);
    expect(setLoadingMessage).toHaveBeenCalledWith('Applying apply-style effect...');
    expect(setError).toHaveBeenCalledWith(null);
    expect(setAnimationAssets).toHaveBeenCalled();
    expect(setAppState).toHaveBeenCalledWith(AppStatus.Animating);
  });
});