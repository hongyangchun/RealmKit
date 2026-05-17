/**
 * SkillChip - 技能标签 Chip
 * 显示技能名称、类型图标
 */
import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import ShieldIcon from '@mui/icons-material/Shield';
import StarIcon from '@mui/icons-material/Star';
import type { Skill } from '../../types';

const TYPE_ICONS: Record<Skill['type'], React.ReactElement> = {
  active: <BoltIcon sx={{ fontSize: 14 }} />,
  passive: <ShieldIcon sx={{ fontSize: 14 }} />,
  special: <StarIcon sx={{ fontSize: 14 }} />,
};

const TYPE_LABELS: Record<Skill['type'], string> = {
  active: '主动',
  passive: '被动',
  special: '特殊',
};

interface SkillChipProps {
  skill: Skill;
  size?: 'small' | 'medium';
}

const SkillChip: React.FC<SkillChipProps> = ({ skill, size = 'small' }) => {
  return (
    <Tooltip title={skill.description} arrow placement="top">
      <Chip
        icon={TYPE_ICONS[skill.type]}
        label={
          <span>
            <b>{skill.name}</b>
            <span style={{ opacity: 0.6, marginLeft: 4, fontSize: '0.75em' }}>
              [{TYPE_LABELS[skill.type]}]
            </span>
          </span>
        }
        size={size}
        variant="outlined"
        sx={{
          borderColor: skill.type === 'active'
            ? '#f39c12'
            : skill.type === 'passive'
              ? '#3498db'
              : '#9b59b6',
          color: skill.type === 'active' ? '#e67e22' : undefined,
          mr: 0.5,
          mb: 0.5,
          '& .MuiChip-icon': {
            color:
              skill.type === 'active'
                ? '#f39c12'
                : skill.type === 'passive'
                  ? '#3498db'
                  : '#9b59b6',
          },
        }}
      />
    </Tooltip>
  );
};

export default SkillChip;
