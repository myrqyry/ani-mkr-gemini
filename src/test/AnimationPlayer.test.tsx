import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AnimationPlayer from 'src/components/AnimationPlayer';
import { AnimationAssets } from 'src/services/geminiService';

const mockAssets: AnimationAssets = {
  imageData: {
    data: 'base64-encoded-string',
    mimeType: 'image/png',
  },
  frameDuration: 120,
};

const mockOnRegenerate = vi.fn();
const mockOnBack = vi.fn();
const mockOnPostProcess = vi.fn();
const mockOnDetectObjects = vi.fn();
const mockClearError = vi.fn();
const mockOnPostProcessStrengthChange = vi.fn();

describe('AnimationPlayer component', () => {
    it('should open the export modal when the export button is clicked', async () => {
        render(
            <AnimationPlayer
                assets={mockAssets}
                frameCount={9}
                onRegenerate={mockOnRegenerate}
                onBack={mockOnBack}
                onPostProcess={mockOnPostProcess}
                onDetectObjects={mockOnDetectObjects}
                detectedObjects={null}
                error={null}
                clearError={mockClearError}
                styleImage={null}
                postProcessStrength={0.9}
                onPostProcessStrengthChange={mockOnPostProcessStrengthChange}
            />
        );

        // Wait for the animation canvas to be ready
        await screen.findByTestId('animation-canvas');

        const exportButton = screen.getByTestId('export-gif-button');
        fireEvent.click(exportButton);

        // Check that the modal is rendered
        const modalTitle = await screen.findByText('Export Animation');
        expect(modalTitle).toBeInTheDocument();
    });
});