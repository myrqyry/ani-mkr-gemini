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
    beforeEach(() => {
        // Mock window.alert before each test
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore the original window.alert after each test
        vi.restoreAllMocks();
    });

    it('should show an alert if gifshot is not loaded when exporting', async () => {
        // Ensure gifshot is undefined to simulate it not being loaded
        Object.defineProperty(window, 'gifshot', {
            value: undefined,
            writable: true,
        });

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

        const exportButton = screen.getByText('Export GIF');
        fireEvent.click(exportButton);

        expect(window.alert).toHaveBeenCalledWith("The GIF exporter is still loading. Please wait a moment and try again.");
    });
    it('should show an alert if gifshot is not loaded when sharing', async () => {
        // Ensure gifshot is undefined to simulate it not being loaded
        Object.defineProperty(window, 'gifshot', {
            value: undefined,
            writable: true,
        });

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

        const shareButton = screen.getByRole('button', { name: /share/i });
        fireEvent.click(shareButton);

        expect(window.alert).toHaveBeenCalledWith("The GIF exporter is still loading. Please wait a moment and try again.");
    });
});