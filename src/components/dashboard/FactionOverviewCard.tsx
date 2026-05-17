/**
 * FactionOverviewCard - 单个势力概览卡片
 * 顶部势力色条 + 名称 + 描述摘要 + 统计标签
 */
import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import PersonIcon from '@mui/icons-material/Person';
import type { Faction } from '../../types';
import { useWorldStore } from '../../store/worldStore';

interface FactionOverviewCardProps {
  faction: Faction;
}

const FactionOverviewCard = React.memo<FactionOverviewCardProps>(({ faction }) => {
  const navigate = useNavigate();
  const cityCount = useWorldStore((s) =>
    s.data.cities.filter((c) => c.factionId === faction.id).length
  );
  const charCount = useWorldStore((s) =>
    s.data.characters.filter((c) => c.factionId === faction.id).length
  );

  return (
    <Box
      onClick={() => navigate('/factions')}
      sx={{
        background: '#fff',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'rgba(0,0,0,0.06)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderColor: 'rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* 顶部势力色条 */}
      <Box
        sx={{
          height: 5,
          background: faction.color,
        }}
      />

      <Box sx={{ p: 2 }}>
        {/* 名称 */}
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{
            color: '#1a237e',
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.9rem',
          }}
        >
          {faction.name}
        </Typography>

        {/* 描述 */}
        {faction.description && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.5,
              fontSize: '0.8rem',
              minHeight: 24,
            }}
          >
            {faction.description}
          </Typography>
        )}

        {/* 统计标签 */}
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          <Chip
            icon={<LocationCityIcon sx={{ fontSize: '0.85rem !important' }} />}
            label={`${cityCount} 城市`}
            size="small"
            sx={{
              backgroundColor: `${faction.color}12`,
              color: faction.color,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 24,
            }}
          />
          <Chip
            icon={<PersonIcon sx={{ fontSize: '0.85rem !important' }} />}
            label={`${charCount} 人物`}
            size="small"
            sx={{
              backgroundColor: `${faction.color}12`,
              color: faction.color,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 24,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
});

export default FactionOverviewCard;
