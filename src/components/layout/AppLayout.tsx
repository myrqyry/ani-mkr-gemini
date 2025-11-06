import React from 'react';
import AppFooter from './AppFooter';
import AppModals from './AppModals';
import { cn } from '../../utils/cn';

const layoutStyles = {
  container: "h-dvh bg-background text-foreground flex flex-col items-center p-4 overflow-y-auto",
  main: "w-full grow flex items-center justify-center animate-fade-in-up",
  responsive: "[@media(max-height:750px)]:items-start"
};

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const AppLayout: React.FC<LayoutProps> = ({ children, className }) => {
  return (
    <div className={cn(layoutStyles.container, "animate-fade-in", className)}>
        <main className={cn(layoutStyles.main, layoutStyles.responsive)}>
            {children}
        </main>
        <AppFooter />
        <AppModals />
    </div>
  );
};

export default AppLayout;
