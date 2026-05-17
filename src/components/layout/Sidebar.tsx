/**
 * Sidebar - 左侧导航栏
 * 支持展开(240px) / 收起(64px)
 * 底部设置按钮打开统一 SettingsDialog
 */
import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MapIcon from '@mui/icons-material/Map';
import PeopleIcon from '@mui/icons-material/People';
import TimelineIcon from '@mui/icons-material/Timeline';
import HubIcon from '@mui/icons-material/Hub';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate, useLocation } from 'react-router-dom';
import SettingsDialog from './SettingsDialog';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: '总览仪表盘', icon: <DashboardIcon />, path: '/' },
  { label: '世界地图', icon: <MapIcon />, path: '/map' },
  { label: '势力疆域', icon: <AccountBalanceIcon />, path: '/factions' },
  { label: '人物设计', icon: <PeopleIcon />, path: '/characters' },
  { label: '历史时间轴', icon: <TimelineIcon />, path: '/timeline' },
  { label: '世界编年史', icon: <MenuBookIcon />, path: '/chronicle' },
];

interface SidebarProps {
  open: boolean;
  drawerWidth: number;
  collapsedWidth: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  drawerWidth,
  collapsedWidth,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState(0);

  const width = open ? drawerWidth : collapsedWidth;

  const openSettings = (tab = 0) => {
    setSettingsInitialTab(tab);
    setSettingsOpen(true);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        transition: 'width 0.3s',
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          overflow: 'hidden',
          transition: 'width 0.3s',
          background: '#1a237e',
          color: '#faf3e0',
          borderRight: 'none',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Logo area */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-start' : 'center',
          px: open ? 2 : 0,
          borderBottom: '1px solid rgba(250,243,224,0.15)',
        }}
      >
        {open ? (
          <Typography
            variant="h6"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              color: '#faf3e0',
              fontWeight: 700,
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
            }}
          >
            📖 世界圣典
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 22 }}>典</Typography>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(250,243,224,0.15)' }} />

      <List sx={{ pt: 1, flexGrow: 1, overflow: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === '/factions' && location.pathname === '/cities');
          return (
            <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
              <Tooltip
                title={!open ? item.label : ''}
                placement="right"
                arrow
              >
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    mx: 1,
                    borderRadius: 2,
                    mb: 0.5,
                    background: isActive
                      ? 'rgba(250,243,224,0.18)'
                      : 'transparent',
                    '&:hover': {
                      background: 'rgba(250,243,224,0.12)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2 : 'auto',
                      justifyContent: 'center',
                      color: isActive ? '#ffd54f' : 'rgba(250,243,224,0.8)',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        sx: {
                          color: isActive ? '#ffd54f' : '#faf3e0',
                          fontWeight: isActive ? 600 : 400,
                          fontSize: '0.9rem',
                          whiteSpace: 'nowrap',
                        },
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* 底部设置入口 */}
      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ borderColor: 'rgba(250,243,224,0.15)' }} />
        <List sx={{ pt: 0.5, pb: 0.5 }}>
          <ListItem disablePadding sx={{ display: 'block' }}>
            <Tooltip title={!open ? '设置' : ''} placement="right" arrow>
              <ListItemButton
                onClick={() => openSettings(0)}
                sx={{
                  minHeight: 40,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  mx: 1,
                  borderRadius: 2,
                  '&:hover': {
                    background: 'rgba(250,243,224,0.12)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 2 : 'auto',
                    justifyContent: 'center',
                    color: 'rgba(250,243,224,0.6)',
                  }}
                >
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary="设置"
                    primaryTypographyProps={{
                      sx: {
                        color: 'rgba(250,243,224,0.6)',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </List>
      </Box>

      {/* 统一设置弹窗 */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsInitialTab}
      />
    </Drawer>
  );
};

export default Sidebar;
