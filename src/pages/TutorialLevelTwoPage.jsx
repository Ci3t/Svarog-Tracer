import React from 'react';
import TutorialPage from './TutorialPage';

export default function TutorialLevelTwoPage({ sessionTheme = 'modern' }) {
  return <TutorialPage sessionTheme={sessionTheme} level={2} />;
}
