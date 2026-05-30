import React from 'react'
import Nav from './components/Nav.jsx'
import Today from './views/Today.jsx'
import Weekly from './views/Weekly.jsx'
import Trends from './views/Trends.jsx'
import Reference from './views/Reference.jsx'
import Settings from './views/Settings.jsx'
import { useAppState } from './hooks/useAppState.js'

export default function App() {
  const appState = useAppState()
  const { view, setView } = appState

  const views = {
    today: <Today appState={appState} />,
    weekly: <Weekly appState={appState} />,
    trends: <Trends appState={appState} />,
    reference: <Reference appState={appState} />,
    settings: <Settings appState={appState} />,
  }

  return (
    <div className="app-layout">
      <div className="view-container">
        {views[view]}
      </div>
      <Nav activeTab={view} onTabChange={setView} />
    </div>
  )
}
