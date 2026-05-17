/**
 * App.tsx - 根组件
 * 路由配置 + AppShell 布局集成
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import FactionCityPage from './pages/FactionCityPage';
import CharacterPage from './pages/CharacterPage';
import TimelinePage from './pages/TimelinePage';
import ChroniclePage from './pages/ChroniclePage';

const App: React.FC = () => {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/factions" element={<FactionCityPage />} />
        <Route path="/cities" element={<Navigate to="/factions" replace />} />
        <Route path="/characters" element={<CharacterPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/chronicle" element={<ChroniclePage />} />
      </Routes>
    </AppShell>
  );
};

export default App;
