<template>
    <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
    </filter>
  </defs>

  <ellipse cx="100" cy="185" rx="40" ry="5" fill="#000000" opacity="0.1" filter="url(#blur)" />

  <path d="M100,185 C100,150 100,100 130,120 C145,130 145,150 145,150" 
        stroke="#556B2F" stroke-width="4" fill="none" stroke-linecap="round" />

  <path d="M105,160 Q80,160 85,180" 
        stroke="#556B2F" stroke-width="3" fill="none" stroke-linecap="round" />

  <g transform="translate(145, 150) rotate(20)">
    <path d="M-5,0 L5,0 L0,10 Z" fill="#556B2F" />
    
    <ellipse cx="0" cy="5" rx="6" ry="10" fill="#8B4513" opacity="0.9" /> <ellipse cx="-4" cy="8" rx="5" ry="9" fill="#A0522D" transform="rotate(-20)" /> <ellipse cx="4" cy="8" rx="5" ry="9" fill="#A0522D" transform="rotate(20)" />
  </g>

  <path d="M135,165 Q140,170 135,175" stroke="#A0522D" stroke-width="2" fill="#CD5C5C" opacity="0.8" transform="rotate(15 135 170)"/>
  
  <path d="M110,185 Q115,180 120,185" fill="#8B4513" opacity="0.9" />
  
  <path d="M125,188 Q130,182 135,188" fill="#A0522D" opacity="0.7" transform="rotate(-10 130 185)"/>

</svg>

    </template>