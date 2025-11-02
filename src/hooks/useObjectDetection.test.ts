import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useObjectDetection } from './useObjectDetection';
import * as geminiService from '../services/gemini';
import { AppStatus } from '../types/types';

vi.mock('../services/gemini');

describe('useObjectDetection', () => {
  it('should detect objects in an animation', async () => {
    const setAppState = vi.fn();
    const setLoadingMessage = vi.fn();
    const setError = vi.fn();
    const setDetectedObjects = vi.fn();

    vi.mocked(geminiService).detectObjects.mockResolvedValue([]);

    const { result } = renderHook(() => useObjectDetection(
      { imageData: { data: 'mock_image_data', mimeType: 'image/jpeg' }, frameDuration: 100 },
      setAppState,
      setLoadingMessage,
      setError,
      setDetectedObjects,
    ));

    await act(async () => {
      await result.current.handleDetectObjects();
    });

    expect(setAppState).toHaveBeenCalledWith(AppStatus.Processing);
    expect(setLoadingMessage).toHaveBeenCalledWith('Detecting objects...');
    expect(setError).toHaveBeenCalledWith(null);
    expect(setDetectedObjects).toHaveBeenCalledWith([]);
    expect(setAppState).toHaveBeenCalledWith(AppStatus.Animating);
  });
});