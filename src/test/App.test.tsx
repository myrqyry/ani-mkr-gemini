import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import { promptSuggestions } from './prompts';

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

describe('App component', () => {
  it('should handle multiple emoji selections correctly', async () => {
    render(<App />);

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
});