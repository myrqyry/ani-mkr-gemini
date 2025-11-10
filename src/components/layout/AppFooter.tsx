import React from 'react';
import { useThemeManager } from "@hooks/useThemeManager";
import ThemeSwitcher from "@components/features/theme/ThemeSwitcher";

const AppFooter: React.FC = () => {
    const {
        currentTheme,
        setCurrentTheme,
        setIsCustomizerOpen,
    } = useThemeManager();
    return (
        <footer className="w-full shrink-0 p-4 text-center text-[var(--color-text-subtle)] text-xs flex justify-center items-center gap-x-6">
            <span>Built with Gemini 1.5 Flash Image Preview | Created by <a href="http://x.com/pitaru" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-accent)]">@pitaru</a></span>
            <ThemeSwitcher
                currentTheme={currentTheme}
                onThemeChange={setCurrentTheme}
                onCustomize={() => setIsCustomizerOpen(true)}
            />
        </footer>
    )
};

export default AppFooter;
