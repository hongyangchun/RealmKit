/**
 * TopBar - 顶部导航栏
 * 包含侧边栏切换、世界名称、全局搜索
 * 导入/导出已收纳到侧边栏设置菜单中
 */
import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import SearchBar from '../common/SearchBar';
import { useWorldStore } from '../../store/worldStore';

interface TopBarProps {
  sidebarOpen: boolean;
  drawerWidth: number;
  collapsedWidth: number;
  onToggleSidebar: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  sidebarOpen,
  drawerWidth,
  collapsedWidth,
  onToggleSidebar,
}) => {
  const worldName = useWorldStore((s) => s.data.meta.name);
  const currentWidth = sidebarOpen ? drawerWidth : collapsedWidth;

  return (
    <AppBar
      position="fixed"
      sx={{
        width: `calc(100% - ${currentWidth}px)`,
        ml: `${currentWidth}px`,
        transition: 'width 0.3s, margin-left 0.3s',
        background: '#1a237e',
        boxShadow: '0 2px 8px rgba(26,35,126,0.3)',
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="toggle sidebar"
          edge="start"
          onClick={onToggleSidebar}
          sx={{ mr: 2, color: '#faf3e0' }}
        >
          {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
        </IconButton>

        <Typography
          variant="h6"
          noWrap
          sx={{
            fontFamily: "'LXGW WenKai TC', serif",
            color: '#ffd54f',
            fontWeight: 700,
            letterSpacing: '0.05em',
            mr: 2,
          }}
        >
          {worldName}
        </Typography>

        {/* Global Search */}
        <Box sx={{ flexGrow: 1, maxWidth: 480 }}>
          <SearchBar />
        </Box>

        <Box sx={{ flexGrow: 1 }} />
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
