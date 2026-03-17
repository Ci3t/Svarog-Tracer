import React from 'react';
import trainSprite from '/The Astral Express Sprite.png';

/**
 * AstralExpress
 * Renders a drifting Astral Express train in the background.
 * The animation is handled by CSS in astral-theme.css (.astral-train)
 */
const AstralExpress = () => {
  return (
    <div className="astral-train-container">
      <img 
        src={trainSprite} 
        alt="Astral Express" 
        className="astral-train"
      />
    </div>
  );
};

export default AstralExpress;
