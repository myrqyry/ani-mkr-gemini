import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AppRouter from '@components/router/AppRouter';
import { AppStateProvider } from '@contexts/AppStateContext';
import { promptSuggestions } from '@services/prompts';
import { TYPING_ANIMATION_TEXT } from '@constants/app';

// Mocking navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    enumerateDevices: vi.fn(async () => {
      return [
        { deviceId: '1', kind: 'videoinput', label: 'Camera 1' },
        { deviceId: '2', kind: 'videoinput', label: 'Camera 2' },
      ];
    }),
  },
  writable: true,
});

const renderApp = () => {
  return render(
    <AppStateProvider>
      <AppRouter />
    </AppStateProvider>
  );
};

describe('App component', () => {
  it('should handle multiple emoji selections correctly', async () => {
    renderApp();

    const storyPromptTextarea = screen.getByLabelText('Animation prompt') as HTMLTextAreaElement;

    const firstSuggestion = promptSuggestions[0];
    const secondSuggestion = promptSuggestions[1];

    const firstSuggestionButton = await screen.findByTitle(firstSuggestion.prompt);
    fireEvent.click(firstSuggestionButton);

    await waitFor(() => {
        expect(storyPromptTextarea.value).toBe(firstSuggestion.prompt);
    });

    const secondSuggestionButton = await screen.findByTitle(secondSuggestion.prompt);
    fireEvent.click(secondSuggestionButton);

    await waitFor(() => {
        expect(storyPromptTextarea.value).toBe(`${firstSuggestion.prompt}, ${secondSuggestion.prompt}`);
    });

    fireEvent.click(firstSuggestionButton);

    await waitFor(() => {
        expect(storyPromptTextarea.value).toBe(secondSuggestion.prompt);
    });
  });

  it('should not restart typing animation on rapid focus/blur when there is content', async () => {
    renderApp();

    const storyPromptTextarea = screen.getByRole('textbox', { name: 'Animation prompt' }) as HTMLTextAreaElement;

    // Initially, placeholder should be visible.
    await waitFor(() => {
      expect(screen.getByTestId('placeholder-text')).toBeInTheDocument();
    });

    // Also check for the animated cursor which is a good sign the effect is running.
    await screen.findByText('|');

    // Type something into the textarea
    fireEvent.change(storyPromptTextarea, { target: { value: 'A test prompt' } });

    // After typing, the placeholder should disappear.
    await waitFor(() => {
      expect(screen.queryByTestId('placeholder-text')).not.toBeInTheDocument();
    });

    // Simulate rapid focus and blur
    fireEvent.focus(storyPromptTextarea);
    fireEvent.blur(storyPromptTextarea);

    // After blur, the placeholder should still not be visible because there is content.
    await waitFor(() => {
        expect(screen.queryByTestId('placeholder-text')).not.toBeInTheDocument();
    });
  });
});
