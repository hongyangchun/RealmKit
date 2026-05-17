/**
 * MapPin - 地图标注组件
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Popover,
} from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import type { MapPin as MapPinType } from '../../types';
import { useWorldStore } from '../../store/worldStore';

interface MapPinProps {
  pin: MapPinType;
  onClick?: (pin: MapPinType) => void;
  selected?: boolean;
}

/** 统一标注颜色 */
const PIN_COLOR = '#C0392B';

const MapPinComponent: React.FC<MapPinProps> = ({ pin, onClick, selected }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const faction = useWorldStore((s) =>
    s.data.factions.find((f) => f.id === pin.factionId)
  );

  return (
    <Box
      onMouseEnter={(e) => setAnchorEl(e.currentTarget)}
      onMouseLeave={() => setAnchorEl(null)}
      sx={{
        position: 'absolute',
        left: `${pin.x}%`,
        top: `${pin.y}%`,
        transform: 'translate(-50%, -100%)',
        cursor: 'pointer',
        zIndex: selected ? 20 : 10,
      }}
    >
      {/* Pin icon */}
      <Box
        onClick={() => onClick?.(pin)}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'transform 0.15s',
          '&:hover': { transform: 'translate(-50%, -100%) scale(1.3)' },
        }}
      >
        <PlaceIcon
          sx={{
            fontSize: selected ? 36 : 30,
            color: PIN_COLOR,
            filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.3))`,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            fontWeight: 600,
            background: PIN_COLOR,
            color: '#fff',
            px: 0.75,
            py: 0.15,
            borderRadius: 4,
            whiteSpace: 'nowrap',
            mt: -1,
          }}
        >
          {pin.label}
        </Typography>
      </Box>

      {/* Hover popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        disableRestoreFocus
        sx={{ pointerEvents: 'none' }}
        PaperProps={{
          sx: { pointerEvents: 'none', p: 1.5, maxWidth: 260 },
        }}
      >
        <Typography variant="subtitle2" fontWeight={700}>
          {pin.label}
        </Typography>
        {pin.description && (
          <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
            {pin.description}
          </Typography>
        )}
        {faction && (
          <Typography variant="caption" display="block" sx={{ mt: 0.25 }}>
            所属：{faction.name}
          </Typography>
        )}
      </Popover>
    </Box>
  );
};

export default MapPinComponent;
