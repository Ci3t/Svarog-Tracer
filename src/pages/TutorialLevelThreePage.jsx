import React from 'react';
import TutorialPage from './TutorialPage';

export default function TutorialLevelThreePage({ sessionTheme = 'modern' }) {
  return <TutorialPage sessionTheme={sessionTheme} level={3} />;
}
