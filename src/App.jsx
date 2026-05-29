import React, { useState, useEffect } from 'react';
import Nav from './components/Nav.jsx';
import Today from './views/Today.jsx';
import Weekly from './views/Weekly.jsx';
import Trends from './views/Trends.jsx';
import Reference from './views/Reference.jsx';
import Settings from './views/Settings.jsx';
import { useAppState } from './hooks/useAppState.js';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const appState = useAppState();

  useEffect(() => {
    if (!isStandalone()) {
      const dismissed = sessionStorage.getItem('install_banner_dismissed');
      if (!dismissed) setShowInstallBanner(true);
    }
  }, []);

  const views = {
    today: <Today appState={appState} />,
    weekly: <Weekly appState={appState} />,
    trends: <Trends appState={appState} />,
    reference: <Reference appState={appState} />,
    settings: <Settings appState={appState} />,
  };

  return (
    <div className="app-layout">
      {showInstallBanner && (
        <div className="install-banner">
          <strong>iOS:</strong> Safari → Share → Add to Home Screen for full PWA experience
          <button
            onClick={() => {
              sessionStorage.setItem('install_banner_dismissed', '1');
              setShowInstallBanner(false);
            }}
            style={{
              marginLeft: 12,
              background: 'none',
              border: 'none',
              color: 'var(--text2)',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="view-container">
        {views[activeTab]}
      </div>

      <Nav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
