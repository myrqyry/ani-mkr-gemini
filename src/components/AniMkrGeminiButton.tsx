/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import Icon from './Icon';

/**
 * Props for the AniMkrGeminiButton component.
 * @interface AniMkrGeminiButtonProps
 * @property {() => void} onClick - Function to call when the button is clicked.
 * @property {string} aria-label - ARIA label for the button.
 * @property {boolean} [disabled] - Whether the button is disabled.
 */
interface AniMkrGeminiButtonProps {
  onClick: () => void;
  'aria-label': string;
  disabled?: boolean;
}

/**
 * A AniMkrGemini button component.
 * @param {AniMkrGeminiButtonProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered component.
 */
const AniMkrGeminiButton: React.FC<AniMkrGeminiButtonProps> = ({ onClick, 'aria-label': ariaLabel, disabled = false }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<HTMLSpanElement[]>([]);

  const text = 'ani-mkr-gemini';

  useEffect(() => {
    if (!textRef.current) return;

    // Split text into individual characters
    const chars = text.split('');
    charsRef.current = [];
    textRef.current.innerHTML = '';

    chars.forEach((char) => {
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
        stagger: 0.05,
        ease: 'back.out(1.7)',
      }
    );

    // Animate icon
    gsap.fromTo(
      iconRef.current,
      {
        scale: 0,
        rotation: -180,
      },
      {
        scale: 1,
        rotation: 0,
        duration: 0.8,
        ease: 'elastic.out(1, 0.5)',
      }
    );
  }, [text]);

  const handleMouseEnter = () => {
    if (disabled) return;

    // Icon bounce
    gsap.to(iconRef.current, {
      y: -10,
      rotation: 15,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Text wave
    gsap.to(charsRef.current, {
      y: -5,
      duration: 0.3,
      stagger: 0.03,
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
    if (disabled) return;

    gsap.to(iconRef.current, {
      y: 0,
      rotation: 0,
      duration: 0.3,
      ease: 'power2.out',
    });

    gsap.to(buttonRef.current, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  const handleClick = () => {
    if (disabled) return;

    // Button pulse
    if (buttonRef.current) {
      gsap.to(buttonRef.current, {
        scale: 0.95,
        duration: 0.1,
        ease: 'power2.in',
        onComplete: () => {
          if (buttonRef.current) {
            gsap.to(buttonRef.current, {
              scale: 1,
              duration: 0.2,
              ease: 'elastic.out(1, 0.3)',
            });
          }
        },
      });
    }

    // Icon spin and scale
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        rotation: 360,
        scale: 1.3,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          if (iconRef.current) {
            gsap.to(iconRef.current, {
              rotation: 0,
              scale: 1,
              duration: 0.3,
              ease: 'power2.out',
            });
          }
        },
      });
    }

    // Character explosion
    if (charsRef.current.length > 0) {
      gsap.to(charsRef.current, {
        y: -30,
        opacity: 0,
        rotation: gsap.utils.wrap([-45, -30, -15, 15, 30, 45]),
        duration: 0.4,
        stagger: 0.02,
        ease: 'power2.in',
        onComplete: () => {
          if (charsRef.current.length > 0) {
            gsap.to(charsRef.current, {
              y: 0,
              opacity: 1,
              rotation: 0,
              duration: 0.4,
              stagger: 0.02,
              ease: 'back.out(1.7)',
            });
          }
        },
      });
    }

    onClick();
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      className={`transition-colors duration-200 focus:outline-none rounded-full p-6 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-special)] shadow-lg ${disabled ? 'filter grayscale opacity-50 cursor-not-allowed' : ''}`}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      data-testid="ani-mkr-gemini-button"
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="flex flex-col items-center gap-2">
        <div ref={iconRef} style={{ transformStyle: 'preserve-3d' }}>
          <Icon className="w-20 h-20" />
        </div>
        <div
          ref={textRef}
          className="text-white font-bold text-lg tracking-wider"
          style={{
            transformStyle: 'preserve-3d',
          }}
        />
      </div>
    </button>
  );
};

export default AniMkrGeminiButton;
