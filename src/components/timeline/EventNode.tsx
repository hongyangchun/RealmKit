/**
 * EventNode - 时间轴事件节点
 * 圆点 + 事件名称直接显示，hover 显示详情 Popover（含冲突详情）
 */
import React, { useState } from 'react';
import { Box, Typography, Popover, Chip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonIcon from '@mui/icons-material/Person';
import type { HistoryEvent, ConflictWarning } from '../../types';
import { useWorldStore } from '../../store/worldStore';

interface EventNodeProps {
  event: HistoryEvent;
  conflicts?: ConflictWarning[];
  onClick?: (event: HistoryEvent) => void;
}

const CONFLICT_TYPE_LABEL: Record<ConflictWarning['type'], string> = {
  death_violation: '时间矛盾',
  location_conflict: '地点冲突',
};

const CONFLICT_TYPE_COLOR: Record<ConflictWarning['type'], 'error' | 'warning'> = {
  death_violation: 'error',
  location_conflict: 'warning',
};

const EventNode: React.FC<EventNodeProps> = ({ event, conflicts = [], onClick }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const characters = useWorldStore((s) => s.data.characters);

  const isConflict = conflicts.length > 0;
  const hasError = conflicts.some((c) => c.severity === 'error');

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  return (
    <Box
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onClick={() => onClick?.(event)}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'transform 0.15s',
        '&:hover': {
          transform: 'scale(1.05)',
        },
      }}
    >
      {/* Node dot */}
      <Box
        sx={{
          width: isConflict ? 14 : 10,
          height: isConflict ? 14 : 10,
          minWidth: isConflict ? 14 : 10,
          borderRadius: isConflict ? '2px' : '50%',
          background: isConflict ? '#C0392B' : '#1a237e',
          border: `1.5px solid ${isConflict ? '#E74C3C' : '#3949ab'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'box-shadow 0.2s',
        }}
      >
        {isConflict && <WarningAmberIcon sx={{ fontSize: 10, color: '#fff' }} />}
      </Box>

      {/* Event title - always visible */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          fontSize: '0.75rem',
          color: isConflict ? '#C0392B' : '#1a237e',
          lineHeight: 1,
          maxWidth: 120,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {event.title}
      </Typography>

      {/* Hover popover - detailed info */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        disableRestoreFocus
        sx={{ pointerEvents: 'none' }}
        PaperProps={{
          sx: {
            pointerEvents: 'none',
            p: 1.5,
            maxWidth: 320,
            background: isConflict ? '#fff5f5' : '#ffffff',
            boxShadow: 3,
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {event.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {event.year}年{event.month ? `${event.month}月` : ''}
          {event.location ? ` · ${event.location}` : ''}
        </Typography>
        {event.description && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
            {event.description}
          </Typography>
        )}

        {/* Conflict details */}
        {isConflict && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed rgba(192,57,43,0.3)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
              <WarningAmberIcon sx={{ fontSize: 14, color: hasError ? '#C0392B' : '#E67E22' }} />
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: hasError ? '#C0392B' : '#E67E22' }}
              >
                发现 {conflicts.length} 条冲突
              </Typography>
            </Box>
            {conflicts.map((c, i) => {
              const char = characters.find((ch) => ch.id === c.characterId);
              return (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 0.5,
                    mb: 0.5,
                    p: 0.75,
                    borderRadius: 1,
                    background: c.severity === 'error'
                      ? 'rgba(192,57,43,0.06)'
                      : 'rgba(230,126,34,0.06)',
                  }}
                >
                  <Chip
                    label={CONFLICT_TYPE_LABEL[c.type]}
                    size="small"
                    color={CONFLICT_TYPE_COLOR[c.type]}
                    sx={{ height: 20, fontSize: '0.65rem', flexShrink: 0 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    {char && (
                      <Typography
                        variant="caption"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.25, fontWeight: 600, color: 'text.primary' }}
                      >
                        <PersonIcon sx={{ fontSize: 12 }} />
                        {char.name}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.3 }}>
                      {c.message}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Popover>
    </Box>
  );
};

export default EventNode;
