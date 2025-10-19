/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

interface AnimatedExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isExporting?: boolean;
  'data-testid'?: string;
}

const AnimatedExportButton: React.FC<AnimatedExportButtonProps> = ({ 
  onClick, 
  disabled = false,
  isExporting = false,
  'data-testid': dataTestId
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<HTMLSpanElement[]>([]);

  const text = isExporting ? 'Exporting...' : 'Export GIF';

  useEffect(() => {
    if (!textRef.current) return;

    // Split text into individual characters
    const chars = text.split('');
    charsRef.current = [];
    textRef.current.innerHTML = '';

    chars.forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.className = 'inline-block';
      span.style.display = 'inline-block';
      textRef.current?.appendChild(span);
      charsRef.current.push(span);
    });

    // Initial animation on mount
    gsap.fromTo(
      charsRef.current,
      {
        opacity: 0,
        y: 20,
        rotationX: -90,
      },
      {
        opacity: 1,
        y: 0,
        rotationX: 0,
        duration: 0.6,
        stagger: 0.03,
        ease: 'back.out(1.7)',
      }
    );
  }, [text]);

  const handleMouseEnter = () => {
    if (disabled || isExporting) return;

    gsap.to(charsRef.current, {
      y: -5,
      duration: 0.3,
      stagger: 0.02,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
    });

    gsap.to(buttonRef.current, {
      scale: 1.05,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  const handleMouseLeave = () => {
    if (disabled || isExporting) return;

    gsap.to(buttonRef.current, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  const handleClick = () => {
    if (disabled || isExporting) return;

    // Click animation
    gsap.to(buttonRef.current, {
      scale: 0.95,
      duration: 0.1,
      ease: 'power2.in',
      onComplete: () => {
        gsap.to(buttonRef.current, {
          scale: 1,
          duration: 0.2,
          ease: 'power2.out',
        });
      },
    });

    // Character explosion effect
    gsap.to(charsRef.current, {
      y: -30,
      opacity: 0,
      duration: 0.4,
      stagger: 0.02,
      ease: 'power2.in',
      onComplete: () => {
        gsap.to(charsRef.current, {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.02,
          ease: 'power2.out',
        });
      },
    });

    onClick();
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled || isExporting}
      data-testid={dataTestId}
      className="bg-[var(--color-success)] text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-[var(--color-accent)] overflow-hidden relative"
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      <div 
        ref={textRef}
        className="relative"
        style={{ 
          transformStyle: 'preserve-3d',
        }}
      />
    </button>
  );
};

export default AnimatedExportButton;
