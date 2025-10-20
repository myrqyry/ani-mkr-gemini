/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

/**
 * Props for the BananaIcon component.
 * @interface BananaIconProps
 * @property {string} [className] - The class name for the component.
 */
interface BananaIconProps {
  className?: string;
}

/**
 * A banana icon component.
 * @param {BananaIconProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered component.
 */
const BananaIcon: React.FC<BananaIconProps> = ({ className = "w-36 h-36" }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bananaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#FFE135', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#FFC300', stopOpacity: 1 }} />
        </linearGradient>
        <radialGradient id="bananaHighlight" cx="30%" cy="30%">
          <stop offset="0%" style={{ stopColor: '#FFED4E', stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: '#FFE135', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      
      {/* Banana body */}
      <path 
        d="M 60 100 Q 50 60, 70 40 Q 90 25, 110 30 Q 130 35, 145 50 Q 160 70, 155 95 Q 150 120, 140 140 Q 130 160, 110 170 Q 90 175, 75 165 Q 60 155, 55 135 Q 50 115, 60 100 Z" 
        fill="url(#bananaGradient)"
        stroke="#D4A017"
        strokeWidth="2"
      />
      
      {/* Banana highlight */}
      <ellipse 
        cx="85" 
        cy="70" 
        rx="25" 
        ry="40" 
        fill="url(#bananaHighlight)"
        opacity="0.6"
      />
      
      {/* Banana stem */}
      <path 
        d="M 70 42 Q 65 35, 68 28 Q 70 22, 75 20 Q 78 19, 80 21 Q 82 24, 80 28 Q 78 32, 72 38" 
        fill="#8B6914"
        stroke="#654321"
        strokeWidth="1"
      />
      
      {/* Brown spots */}
      <ellipse cx="90" cy="100" rx="8" ry="10" fill="#8B6914" opacity="0.4" />
      <ellipse cx="115" cy="120" rx="6" ry="8" fill="#8B6914" opacity="0.4" />
      <ellipse cx="130" cy="80" rx="7" ry="9" fill="#8B6914" opacity="0.3" />
      <ellipse cx="105" cy="140" rx="5" ry="7" fill="#8B6914" opacity="0.4" />
    </svg>
  );
};

export default BananaIcon;
