/**
 * RecentEditList - 最近编辑记录列表
 * 基于事件和人物的 updatedAt 推断最近活动
 * 每条记录可点击跳转到对应模块
 */
import React from 'react';
import { Box, List, ListItem, ListItemText, Typography, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import { useWorldStore } from '../../store/worldStore';

const RecentEditList: React.FC = () => {
  const navigate = useNavigate();
  const characters = useWorldStore((s) => s.data.characters);
  const events = useWorldStore((s) => s.data.events);

  // Combine and sort by creation (simulated recent activity)
  const recentItems = React.useMemo(() => {
    const charItems = characters.slice(-5).reverse().map((c) => ({
      id: c.id,
      label: `新增人物「${c.name}」`,
      type: 'character' as const,
      detail: c.title || '无职衔',
      path: '/characters',
    }));
    const eventItems = events.slice(-5).reverse().map((e) => ({
      id: e.id,
      label: `${e.year}年 · ${e.title}`,
      type: 'event' as const,
      detail: e.location ?? '',
      path: '/timeline',
    }));
    return [...charItems, ...eventItems].slice(0, 10);
  }, [characters, events]);

  if (recentItems.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: '#aaa' }}>
        <Typography variant="body2">暂无编辑记录</Typography>
      </Box>
    );
  }

  return (
    <List dense disablePadding>
      {recentItems.map((item, idx) => (
        <React.Fragment key={`${item.type}-${item.id}`}>
          {idx > 0 && <Divider component="li" />}
          <ListItem
            onClick={() => navigate(item.path)}
            sx={{
              py: 1,
              px: 1.5,
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'background 0.15s',
              '&:hover': {
                background: 'rgba(26,35,126,0.06)',
              },
            }}
          >
            <span
              style={{
                marginRight: 8,
                color: item.type === 'character' ? '#1a237e' : '#C0392B',
                fontSize: 18,
              }}
            >
              {item.type === 'character' ? (
                <PersonIcon fontSize="small" />
              ) : (
                <EventIcon fontSize="small" />
              )}
            </span>
            <ListItemText
              primary={
                <Typography variant="body2" fontWeight={600}>
                  {item.label}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {item.detail}
                </Typography>
              }
            />
          </ListItem>
        </React.Fragment>
      ))}
    </List>
  );
};

export default RecentEditList;
