import React from 'react';
import { useCompanion, COMPANION_TYPES } from './CompanionProvider';

const COMPANIONS = [
  {
    id: COMPANION_TYPES.SPARKLE,
    label: 'Sparkle',
    portrait: '/clara-prof-assistant.png', // Replace with sparkle portrait when available
    color: '#a78bfa',
  },
  {
    id: COMPANION_TYPES.CLARA,
    label: 'Clara',
    portrait: '/clara-prof-assistant.png',
    color: '#ff6b9f',
  },
];

export default function CompanionSelector({ className }) {
  const { activeCompanion, selectCompanion } = useCompanion();

  return (
    <div className={`companion-selector ${className || ''}`}>
      <div className="companion-selector__label">Guide</div>
      <div className="companion-selector__options">
        {COMPANIONS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => selectCompanion(c.id)}
            className={`companion-selector__btn ${activeCompanion === c.id ? 'companion-selector__btn--active' : ''}`}
            style={{ '--companion-color': c.color }}
            aria-pressed={activeCompanion === c.id}
          >
            <img src={c.portrait} alt={c.label} className="companion-selector__portrait" />
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
