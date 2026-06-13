/**
 * SkillChip - 技能标签（三国杀印章风格）
 * 主动/被动/特殊 三色系 · 深底描边徽章
 */
import React from 'react';
import { Box, Tooltip } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import ShieldIcon from '@mui/icons-material/Shield';
import StarIcon from '@mui/icons-material/Star';
import type { Skill } from '../../types';

// 三色体系：主动(赤) / 被动(青) / 特殊(紫)
const TYPE_CONFIG: Record<Skill['type'], {
  icon: React.ReactElement;
  label: string;
  border: string;
  bg: string;
  color: string;
  iconColor: string;
}> = {
  active: {
    icon: <BoltIcon sx={{ fontSize: 11 }} />,
    label: '主动',
    border: '#c0392b',
    bg: 'rgba(192,57,43,0.15)',
    color: '#e07060',
    iconColor: '#e05040',
  },
  passive: {
    icon: <ShieldIcon sx={{ fontSize: 11 }} />,
    label: '被动',
    border: '#1a6a8a',
    bg: 'rgba(26,106,138,0.15)',
    color: '#5aaad0',
    iconColor: '#4090b8',
  },
  special: {
    icon: <StarIcon sx={{ fontSize: 11 }} />,
    label: '特殊',
    border: '#6a3a8a',
    bg: 'rgba(106,58,138,0.15)',
    color: '#b080d8',
    iconColor: '#9060b8',
  },
};

interface SkillChipProps {
  skill: Skill;
  size?: 'small' | 'medium';
}

const SkillChip: React.FC<SkillChipProps> = ({ skill }) => {
  const cfg = TYPE_CONFIG[skill.type];
  return (
    <Tooltip title={skill.description || ''} arrow placement="top">
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          px: '6px',
          py: '2px',
          mr: '4px',
          mb: '4px',
          borderRadius: '3px',
          border: `0.5px solid ${cfg.border}`,
          background: cfg.bg,
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        {/* 类型图标 */}
        <Box sx={{ color: cfg.iconColor, display: 'flex', alignItems: 'center', lineHeight: 1 }}>
          {cfg.icon}
        </Box>
        {/* 技能名 */}
        <Box
          component="span"
          sx={{
            fontSize: '0.68rem',
            fontWeight: 500,
            color: cfg.color,
            fontFamily: "'LXGW WenKai TC', serif",
            letterSpacing: '0.04em',
            lineHeight: 1.4,
          }}
        >
          {skill.name}
        </Box>
        {/* 类型标注 */}
        <Box
          component="span"
          sx={{
            fontSize: '0.56rem',
            color: `${cfg.color}88`,
            fontFamily: "'LXGW WenKai TC', serif",
            lineHeight: 1.4,
          }}
        >
          [{cfg.label}]
        </Box>
      </Box>
    </Tooltip>
  );
};

export default SkillChip;
