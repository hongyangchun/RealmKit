/**
 * FactionCard - 势力卡片（手风琴模式）
 * 支持展开/收起，展开时内嵌该势力的城市列表
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
  Collapse,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import type { Faction, City } from '../../types';
import { useWorldStore } from '../../store/worldStore';
import { getContrastTextColor } from '../../utils/color';
import CompactCityCard from '../city/CompactCityCard';

interface FactionCardProps {
  faction: Faction;
  expanded?: boolean;
  highlightedCityIds?: Set<string>;
  onEdit?: (faction: Faction) => void;
  onDelete?: (faction: Faction) => void;
  onToggleExpand?: (factionId: string) => void;
  onEditCity?: (city: City) => void;
  onDeleteCity?: (city: City) => void;
  onAddCity?: (factionId: string) => void;
}

const FactionCard = React.memo<FactionCardProps>(({
  faction,
  expanded = false,
  highlightedCityIds,
  onEdit,
  onDelete,
  onToggleExpand,
  onEditCity,
  onDeleteCity,
  onAddCity,
}) => {
  const [hovered, setHovered] = useState(false);
  const characterCount = useWorldStore((s) =>
    s.data.characters.filter((c) => c.factionId === faction.id).length
  );
  const cities = useWorldStore((s) =>
    s.data.cities.filter((c) => c.factionId === faction.id)
  );

  // Compute lifespan string
  const lifespan =
    faction.foundedYear !== undefined
      ? `${faction.foundedYear}${faction.dissolvedYear !== undefined ? ` - ${faction.dissolvedYear}` : ' - 至今'}`
      : undefined;

  const textColor = getContrastTextColor(faction.color);

  return (
    <Card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        position: 'relative',
        maxWidth: 480,
        width: '100%',
        borderRadius: '12px',
        background: '#fffef8',
        cursor: 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: expanded
          ? '0 6px 20px rgba(26,35,126,0.15)'
          : hovered
            ? '0 6px 20px rgba(26,35,126,0.12)'
            : '0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'visible',
      }}
    >
      {/* Header: Color Banner */}
      <Box
        sx={{
          height: 72,
          background: faction.color,
          borderRadius: expanded ? '12px 12px 0 0' : '12px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          px: 2,
          pb: 1,
          cursor: 'pointer',
          transition: 'border-radius 0.3s',
        }}
        onClick={() => onToggleExpand?.(faction.id)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 700,
              color: textColor,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              lineHeight: 1,
            }}
          >
            {faction.name}
          </Typography>
          {lifespan && (
            <Typography
              variant="caption"
              sx={{
                color: textColor,
                fontWeight: 500,
                background: 'rgba(0,0,0,0.2)',
                px: 1,
                py: 0.3,
                borderRadius: 1,
              }}
            >
              {lifespan}
            </Typography>
          )}
        </Box>

        {/* 展开/收起箭头 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {cities.length > 0 && (
            <Chip
              icon={<LocationCityIcon sx={{ fontSize: 14 }} />}
              label={`${cities.length} 城`}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                background: 'rgba(255,255,255,0.25)',
                color: textColor,
                fontWeight: 600,
                '& .MuiChip-icon': { color: textColor },
              }}
            />
          )}
          <IconButton
            size="small"
            sx={{
              color: textColor,
              transition: 'transform 0.3s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* 编辑/删除按钮 (悬停时显示在 banner 上) */}
      {hovered && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
            zIndex: 2,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="编辑势力">
            <IconButton
              size="small"
              onClick={() => onEdit?.(faction)}
              sx={{
                background: 'rgba(255,255,255,0.9)',
                '&:hover': { background: '#fff' },
              }}
            >
              <EditIcon fontSize="small" sx={{ color: '#1a237e' }} />
            </IconButton>
          </Tooltip>
          {onDelete && (
            <Tooltip title="删除势力">
              <IconButton
                size="small"
                onClick={() => onDelete(faction)}
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

      {/* 内容区：描述 + 统计 */}
      <CardContent sx={{ px: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Description */}
        {faction.description && (
          <Typography
            variant="body2"
            sx={{
              color: '#555',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 3 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {faction.description}
          </Typography>
        )}

        {/* Stats Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<GroupsIcon sx={{ fontSize: 16 }} />}
            label={`${characterCount} 人`}
            size="small"
            sx={{
              fontSize: '0.75rem',
              background: '#f5f0e6',
              color: '#554433',
            }}
          />
          {cities.length > 0 && (
            <Chip
              icon={<LocationCityIcon sx={{ fontSize: 16 }} />}
              label={`${cities.length} 城`}
              size="small"
              sx={{
                fontSize: '0.75rem',
                background: '#f3e5f5',
                color: '#4a148c',
              }}
            />
          )}
        </Box>
      </CardContent>

      {/* 展开区域：城市列表 */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            borderTop: '1px solid rgba(0,0,0,0.08)',
            px: 1,
            py: 1,
          }}
        >
          {/* 城市列表 */}
          {cities.length > 0 ? (
            cities.map((city) => (
              <CompactCityCard
                key={city.id}
                city={city}
                factionColor={faction.color}
                onEdit={onEditCity}
                onDelete={onDeleteCity}
                highlighted={highlightedCityIds?.has(city.id)}
              />
            ))
          ) : (
            <Box
              sx={{
                textAlign: 'center',
                py: 2,
                color: '#999',
              }}
            >
              <Typography variant="body2">
                暂无城市，点击下方按钮添加
              </Typography>
            </Box>
          )}

          {/* 添加城市按钮 */}
          <Box sx={{ px: 1, pt: 1, pb: 0.5 }}>
            <Chip
              icon={<AddIcon />}
              label="添加城市"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onAddCity?.(faction.id);
              }}
              sx={{
                cursor: 'pointer',
                background: `${faction.color}15`,
                color: faction.color,
                fontWeight: 600,
                border: `1px dashed ${faction.color}40`,
                '&:hover': {
                  background: `${faction.color}25`,
                },
              }}
            />
          </Box>
        </Box>
      </Collapse>
    </Card>
  );
});

export default FactionCard;
