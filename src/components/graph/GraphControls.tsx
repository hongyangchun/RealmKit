/**
 * GraphControls - 关系图过滤控制栏
 */
import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  FormControl,
  SelectChangeEvent,
} from '@mui/material';
import { useWorldStore } from '../../store/worldStore';

interface GraphControlsProps {
  selectedFactions: string[];
  onFactionToggle: (factionId: string) => void;
  selectedRelationTypes: string[];
  onRelationTypeToggle: (type: string) => void;
}

const GraphControls: React.FC<GraphControlsProps> = ({
  selectedFactions,
  onFactionToggle,
  selectedRelationTypes,
  onRelationTypeToggle,
}) => {
  const factions = useWorldStore((s) => s.data.factions);
  const relations = useWorldStore((s) => s.data.relations);

  // Extract unique relation types
  const relationTypes = useMemo(
    () => Array.from(new Set(relations.map((r) => r.type))),
    [relations]
  );

  return (
    <Box sx={{
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 10,
      background: 'rgba(255,255,255,0.95)',
      borderRadius: 2,
      p: 2,
      minWidth: 200,
      boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    }}>
      {/* Faction filter */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        按势力过滤
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
        {factions.length === 0 && (
          <Typography variant="caption" color="text.secondary">暂无势力数据</Typography>
        )}
        {factions.map((f) => (
          <Chip
            key={f.id}
            label={f.name}
            size="small"
            onClick={() => onFactionToggle(f.id)}
            variant={selectedFactions.includes(f.id) ? 'filled' : 'outlined'}
            sx={{
              background: selectedFactions.includes(f.id)
                ? f.color
                : 'transparent',
              color: selectedFactions.includes(f.id) ? '#fff' : '#555',
              borderColor: f.color,
            }}
          />
        ))}
      </Box>

      {/* Relation type filter */}
      {relationTypes.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            按关系类型过滤
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {relationTypes.map((type) => (
              <Chip
                key={type}
                label={type}
                size="small"
                onClick={() => onRelationTypeToggle(type)}
                variant={selectedRelationTypes.includes(type) ? 'filled' : 'outlined'}
                sx={{
                  background: selectedRelationTypes.includes(type)
                    ? '#1a237e'
                    : 'transparent',
                  color: selectedRelationTypes.includes(type)
                    ? '#faf3e0'
                    : '#555',
                  borderColor: '#1a237e',
                }}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default GraphControls;
