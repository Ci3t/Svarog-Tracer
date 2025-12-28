// Modern Kiyo Mode Card - Wrapper with Modern Layout
// This component wraps the existing KiyoModeCard logic but reorganizes the visual layout
import React from 'react';
import KiyoModeCard from './KiyoModeCard';
import './ModernKiyoModeCard.css'; // We'll create custom CSS for layout override

export default function ModernKiyoModeCard(props) {
  return (
    <div className="modern-kiyo-wrapper">
      <KiyoModeCard {...props} />
    </div>
  );
}
