/**
 * ConflictBadge - 冲突警告徽章（故事种子风格）
 * 重新设计：从"红色错误"变为"金色神秘徽章"
 */
import React from 'react';
import { Tooltip, Badge, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { ConflictWarning } from '../../types';

interface ConflictBadgeProps {
  conflicts: ConflictWarning[];
  size?: 'small' | 'medium';
  /** 点击徽章时触发（如打开 StorySeedDialog） */
  onClick?: (event?: React.MouseEvent) => void;
}

const ConflictBadge: React.FC<ConflictBadgeProps> = ({
  conflicts,
  size = 'small',
  onClick,
}) => {
  if (conflicts.length === 0) return null;

  // 新的神秘提示文案
  const mysteryMessages = conflicts.map((c) => {
    if (c.type === 'death_violation') {
      return `💀 ${c.message.replace(/^.*已于 (\d+)年去世，/, '此人早在 $1 年就已离世，却在 ')}`;
    } else {
      return `🔮 ${c.message}`;
    }
  });

  return (
    <Tooltip
      title={
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#ffd54f' }}>
            🔮 世界之谜
          </div>
          {mysteryMessages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 2 }}>{msg}</div>
          ))}
          {onClick && (
            <div style={{ marginTop: 6, fontStyle: 'italic', color: '#ffd54f80' }}>
              点击查看详情 →
            </div>
          )}
        </div>
      }
      arrow
    >
      <Badge
        badgeContent={conflicts.length}
        sx={{
          '& .MuiBadge-badge': {
            backgroundColor: '#f57f17',
            color: '#fff',
            fontWeight: 700,
            fontSize: size === 'small' ? '0.65rem' : '0.75rem',
          },
        }}
      >
        <IconButton
          size={size}
          onClick={onClick}
          sx={{
            color: '#f57f17',
            p: 0.5,
            backgroundColor: '#fff8e1',
            border: '1px solid #ffd54f',
            borderRadius: 1.5,
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: '#fff3cd',
              transform: 'scale(1.1)',
              boxShadow: '0 2px 8px rgba(245,127,23,0.3)',
            },
          }}
        >
          <HelpOutlineIcon fontSize={size} />
        </IconButton>
      </Badge>
    </Tooltip>
  );
};

export default ConflictBadge;
