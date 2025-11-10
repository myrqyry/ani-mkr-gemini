
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AnimationPlayer from '@components/AnimationPlayer';
import { AnimationAssets } from '@services/gemini';

const mockAssets: AnimationAssets = {
  imageData: {
    data: 'base64-encoded-string',
    mimeType: 'image/png',
  },
  frameDuration: 120,
  frames: [],
};

describe('AnimationPlayer component', () => {
  it('should call onExport when the export button is clicked', async () => {
    const mockOnExport = vi.fn();
    render(
      <AnimationPlayer
        assets={mockAssets}
        frameCount={9}
        onRegenerate={vi.fn()}
        onBack={vi.fn()}
        onExport={mockOnExport}
        onPostProcess={vi.fn()}
        onDetectObjects={vi.fn()}
        detectedObjects={null}
        error={null}
        clearError={vi.fn()}
        styleImage={null}
        postProcessStrength={0.9}
        onPostProcessStrengthChange={vi.fn()}
      />
    );

    await screen.findByTestId('animation-canvas');

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    expect(mockOnExport).toHaveBeenCalledTimes(1);
  });
});
