import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import WorkspacePage from './pages/WorkspacePage';

export default function App() {
  const [currentView, setCurrentView] = useState('workspace'); // default to 'workspace' for copilot, switchable to 'landing'
  const [initialRepo, setInitialRepo] = useState('facebook/react');

  const handleLaunchWorkspace = (repo) => {
    if (repo) setInitialRepo(repo);
    setCurrentView('workspace');
  };

  const handleNavigateToLanding = () => {
    setCurrentView('landing');
  };

  return (
    <div className="w-full min-h-screen bg-[#0B0F19]">
      {currentView === 'landing' ? (
        <LandingPage
          onLaunchWorkspace={handleLaunchWorkspace}
        />
      ) : (
        <WorkspacePage
          initialRepo={initialRepo}
          onNavigateToLanding={handleNavigateToLanding}
        />
      )}
    </div>
  );
}
