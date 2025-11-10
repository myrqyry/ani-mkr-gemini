import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnimationCreator } from './useAnimationCreator';
import * as imageUtils from '@utils/image';
import { AppStatus } from '@types/types';

// Mock the global fetch function
global.fetch = vi.fn();

vi.mock('../utils/image');

describe('useAnimationCreator', () => {
  it('should create an animation', async () => {
    const setAppState = vi.fn();
    const setLoadingMessage = vi.fn();
    const setError = vi.fn();
    const setAnimationAssets = vi.fn();
    const setStoryPrompt = vi.fn();

    // Mock the streaming response
    const mockStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const progressChunk = { type: 'progress', message: 'Generating frames...' };
        const resultChunk = {
          type: 'result',
          imageData: { data: 'mock_image_data', mimeType: 'image/jpeg' },
          frameDuration: 100,
        };
        controller.enqueue(encoder.encode(JSON.stringify(progressChunk) + '\n'));
        controller.enqueue(encoder.encode(JSON.stringify(resultChunk) + '\n'));
        controller.close();
      },
    });

    const mockResponse = {
      ok: true,
      body: mockStream,
      headers: new Headers({ 'Content-Type': 'application/json' }),
    };
    (fetch as any).mockResolvedValue(mockResponse);

    vi.mocked(imageUtils.resizeImage).mockResolvedValue({
      dataUrl: 'data:image/jpeg;base64,mock_image_data',
      mime: 'image/jpeg',
    });

    const { result } = renderHook(() => useAnimationCreator(
      { original: 'test_image', style: null, motion: null },
      'test prompt',
      9,
      setAppState,
      setLoadingMessage,
      setError,
      setAnimationAssets,
      setStoryPrompt,
      null
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
