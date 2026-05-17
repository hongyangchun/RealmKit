/**
 * CompactCityCard - 紧凑型城市卡片
 * 用于手风琴展开区域内的城市列表展示
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import StarIcon from '@mui/icons-material/Star';
import type { City } from '../../types';
import { CITY_TYPE_LABELS, CITY_TYPE_ICONS } from '../../constants/cityTypes';

interface CompactCityCardProps {
  city: City;
  factionColor: string;
  highlighted?: boolean;
  onEdit?: (city: City) => void;
  onDelete?: (city: City) => void;
}

const CompactCityCard = React.memo<CompactCityCardProps>(({
  city,
  factionColor,
  highlighted = false,
  onEdit,
  onDelete,
}) => {
  const [hovered, setHovered] = useState(false);

  const typeLabel = CITY_TYPE_LABELS[city.type] ?? city.type;

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onEdit?.(city)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        background: highlighted
          ? 'rgba(26,35,126,0.08)'
          : hovered
            ? '#f5f0e6'
            : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
        position: 'relative',
        '&:not(:last-child)': {
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        },
      }}
    >
      {/* 左侧颜色标记条 */}
      <Box
        sx={{
          width: 4,
          height: 32,
          borderRadius: 2,
          background: factionColor,
          flexShrink: 0,
        }}
      />

      {/* 城市图标 */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: `${factionColor}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {city.isCapital ? (
          <StarIcon sx={{ fontSize: 16, color: factionColor }} />
        ) : (
          <LocationCityIcon sx={{ fontSize: 16, color: factionColor }} />
        )}
      </Box>

      {/* 名称 + 描述 */}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 600,
              color: '#333',
              lineHeight: 1.3,
            }}
          >
            {city.name}
          </Typography>
          <Chip
            label={typeLabel}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              background: `${factionColor}20`,
              color: factionColor,
              fontWeight: 600,
            }}
          />
        </Box>
        {city.description && (
          <Typography
            variant="caption"
            sx={{
              color: '#888',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
            }}
          >
            {city.description}
          </Typography>
        )}
      </Box>

      {/* 右侧统计 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        {city.population !== undefined && (
          <Typography variant="caption" sx={{ color: '#999', whiteSpace: 'nowrap' }}>
            {city.population.toLocaleString()}
          </Typography>
        )}
      </Box>

      {/* 操作按钮 */}
      {hovered && (
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            flexShrink: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="编辑">
            <IconButton
              size="small"
              onClick={() => onEdit?.(city)}
              sx={{
                width: 28,
                height: 28,
                '&:hover': { background: '#e0d8c8' },
              }}
            >
              <EditIcon sx={{ fontSize: 14, color: '#1a237e' }} />
            </IconButton>
          </Tooltip>
          {onDelete && (
            <Tooltip title="删除">
              <IconButton
                size="small"
                onClick={() => onDelete(city)}
                sx={{
                  width: 28,
                  height: 28,
                  '&:hover': { background: '#ffebee' },
                }}
              >
                <DeleteIcon sx={{ fontSize: 14, color: '#C62828' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
});

export default CompactCityCard;
