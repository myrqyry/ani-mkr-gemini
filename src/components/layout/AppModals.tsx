import React from 'react';
import { useUIState, useAnimationState } from "@contexts/AppStateContext";
import ExportModal from "@components/ExportModal";
import ThemeCustomizer from "@components/features/theme/ThemeCustomizer";
import { useThemeManager } from '@hooks/useThemeManager';

const AppModals: React.FC = () => {
  const { ui, actions: uiActions } = useUIState();
  const { animation } = useAnimationState();
  const { isExportModalOpen } = ui;
  const { animationAssets } = animation;
  const {
    currentTheme,
    customThemes,
    isCustomizerOpen,
    handleColorChange,
    handleThemeReset,
    handleThemeExport,
    handleThemeImport,
    setIsCustomizerOpen,
  } = useThemeManager();

  return (
    <>
      {isCustomizerOpen && (
        <ThemeCustomizer
          theme={currentTheme}
          customColors={customThemes[currentTheme] || {}}
          onColorChange={handleColorChange}
          onReset={handleThemeReset}
          onImport={handleThemeImport}
          onExport={handleThemeExport}
          onClose={() => setIsCustomizerOpen(false)}
        />
      )}
      {isExportModalOpen && animationAssets && (
        <div className="animate-scale-in">
          <ExportModal
            frames={animationAssets.frames}
            width={512}
            height={512}
            onClose={() => uiActions.setIsExportModalOpen(false)}
          />
        </div>
      )}
    </>
  );
};

export default AppModals;
