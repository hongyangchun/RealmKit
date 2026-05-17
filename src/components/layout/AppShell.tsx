/**
 * AppShell - 整体布局容器
 * TopBar + Sidebar + 主内容区
 */
import React, { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

const DRAWER_WIDTH = 240;
const COLLAPSED_WIDTH = 64;

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#faf3e0' }}>
      <TopBar
        sidebarOpen={sidebarOpen}
        drawerWidth={DRAWER_WIDTH}
        collapsedWidth={COLLAPSED_WIDTH}
        onToggleSidebar={handleToggleSidebar}
      />
      <Sidebar
        open={sidebarOpen}
        drawerWidth={DRAWER_WIDTH}
        collapsedWidth={COLLAPSED_WIDTH}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          minHeight: '100vh',
          background: '#faf3e0',
          overflow: 'hidden',
        }}
      >
        {/* Offset for fixed AppBar */}
        <Toolbar />
        <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppShell;
