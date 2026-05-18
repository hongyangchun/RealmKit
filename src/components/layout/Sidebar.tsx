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
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExploreIcon from '@mui/icons-material/Explore';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PeopleIcon from '@mui/icons-material/People';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate, useLocation } from 'react-router-dom';
import SettingsDialog from './SettingsDialog';
import { useSFX } from '../../hooks/useSFX';

// ─── 叙事化导航配置 ───────────────────────────────────────

interface NavItem {
  label: string;
  /** 叙事化标签 — 悬停时显示的诗意名称 */
  narrativeLabel: string;
  icon: React.ReactNode;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: '总览', narrativeLabel: '星穹之眼', icon: <AutoAwesomeIcon />, path: '/' },
  { label: '地图', narrativeLabel: '大陆图鉴', icon: <ExploreIcon />, path: '/map' },
  { label: '势力', narrativeLabel: '王权之座', icon: <AccountBalanceIcon />, path: '/factions' },
  { label: '人物', narrativeLabel: '英雄名录', icon: <PeopleIcon />, path: '/characters' },
  { label: '时间轴', narrativeLabel: '时光长河', icon: <HourglassEmptyIcon />, path: '/timeline' },
  { label: '编年史', narrativeLabel: '史册典籍', icon: <MenuBookIcon />, path: '/chronicle' },
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
  const sfx = useSFX();
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
                title={!open ? `${item.narrativeLabel}·${item.label}` : ''}
                placement="right"
                arrow
              >
                <ListItemButton
                  onClick={() => {
                    if (location.pathname !== item.path) {
                      sfx.playTabSwitch();
                    }
                    navigate(item.path);
                  }}
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
                    position: 'relative',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      background: 'rgba(250,243,224,0.12)',
                      transform: 'translateX(2px)',
                    },
                    '&:hover .nav-icon': {
                      transform: isActive ? 'scale(1.1)' : 'scale(1.15)',
                      filter: isActive ? undefined : 'drop-shadow(0 0 4px rgba(255,213,79,0.3))',
                    },
                    '&:hover .narrative-hint': {
                      opacity: 1,
                    },
                  }}
                >
                  {/* 活跃指示器 — 左侧金色竖条 */}
                  {isActive && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: 20,
                        borderRadius: '0 2px 2px 0',
                        background: '#ffd54f',
                        boxShadow: '0 0 6px rgba(255,213,79,0.4)',
                      }}
                    />
                  )}
                  <ListItemIcon
                    className="nav-icon"
                    sx={{
                      minWidth: 0,
                      mr: open ? 2 : 'auto',
                      justifyContent: 'center',
                      color: isActive ? '#ffd54f' : 'rgba(250,243,224,0.8)',
                      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                          <Typography
                            component="span"
                            sx={{
                              color: isActive ? '#ffd54f' : '#faf3e0',
                              fontWeight: isActive ? 600 : 400,
                              fontSize: '0.9rem',
                              whiteSpace: 'nowrap',
                              fontFamily: "'LXGW WenKai TC', serif",
                            }}
                          >
                            {item.label}
                          </Typography>
                          <Typography
                            className="narrative-hint"
                            component="span"
                            sx={{
                              color: 'rgba(255,213,79,0.5)',
                              fontSize: '0.65rem',
                              opacity: 0,
                              transition: 'opacity 0.25s',
                              fontStyle: 'italic',
                            }}
                          >
                            {item.narrativeLabel}
                          </Typography>
                        </Box>
                      }
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
                onClick={() => {
                  sfx.playClick();
                  openSettings(0);
                }}
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
