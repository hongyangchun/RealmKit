/**
 * CityCard - 城市卡片
 * 显示城市名称、势力颜色、类型、人口
 */
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import type { City } from '../../types';
import { useWorldStore } from '../../store/worldStore';
import { CITY_TYPE_LABELS } from '../../constants/cityTypes';
import { getContrastTextColor } from '../../utils/color';

interface CityCardProps {
  city: City;
  onEdit?: (city: City) => void;
  onDelete?: (city: City) => void;
}

const CityCard = React.memo<CityCardProps>(({ city, onEdit, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const faction = useWorldStore((s) =>
    s.data.factions.find((f) => f.id === city.factionId)
  );

  const bannerColor = faction?.color ?? '#8B4513';
  const textColor = getContrastTextColor(bannerColor);

  return (
    <Card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        position: 'relative',
        maxWidth: 320,
        width: '100%',
        borderRadius: '12px',
        background: '#fffef8',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 8px 24px rgba(26,35,126,0.15)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'visible',
      }}
      onClick={() => onEdit?.(city)}
    >
      {/* Header: Color Banner */}
      <Box
        sx={{
          height: 72,
          background: bannerColor,
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          px: 2,
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationCityIcon sx={{ color: textColor, fontSize: 20 }} />
          <Typography
            variant="h6"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 700,
              color: textColor,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              lineHeight: 1,
            }}
          >
            {city.name}
          </Typography>
        </Box>
        <Chip
          label={CITY_TYPE_LABELS[city.type] ?? city.type}
          size="small"
          sx={{
            background: 'rgba(255,255,255,0.25)',
            color: textColor,
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      </Box>

      {/* Content */}
      <CardContent sx={{ p: 2 }}>
        {/* Description */}
        {city.description && (
          <Typography
            variant="body2"
            sx={{
              color: '#555',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {city.description}
          </Typography>
        )}

        {/* Stats Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {faction && (
            <Chip
              label={faction.name}
              size="small"
              sx={{
                fontSize: '0.75rem',
                background: '#f5f0e6',
                color: '#554433',
              }}
            />
          )}
          {city.population !== undefined && (
            <Chip
              label={`人口 ${city.population.toLocaleString()}`}
              size="small"
              sx={{
                fontSize: '0.75rem',
                background: '#f5f0e6',
                color: '#554433',
              }}
            />
          )}
          <Chip
            label={`(${city.gridX}, ${city.gridY})`}
            size="small"
            sx={{
              fontSize: '0.7rem',
              background: '#e8e8e8',
              color: '#888',
            }}
          />
        </Box>
      </CardContent>

      {/* Edit/Delete buttons (show on hover) */}
      {hovered && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="编辑">
            <IconButton
              size="small"
              onClick={() => onEdit?.(city)}
              sx={{
                background: 'rgba(255,255,255,0.9)',
                '&:hover': { background: '#fff' },
              }}
            >
              <EditIcon fontSize="small" sx={{ color: '#1a237e' }} />
            </IconButton>
          </Tooltip>
          {onDelete && (
            <Tooltip title="删除">
              <IconButton
                size="small"
                onClick={() => onDelete(city)}
                sx={{
                  background: 'rgba(255,255,255,0.9)',
                  '&:hover': { background: '#fff' },
                }}
              >
                <DeleteIcon fontSize="small" sx={{ color: '#C62828' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </Card>
  );
});

export default CityCard;
