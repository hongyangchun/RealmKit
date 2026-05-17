/**
 * ColorPicker - 颜色选择器组件
 * 紧凑色块按钮 + Popover 选择面板
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Popover,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import { useWorldStore } from '../../store/worldStore';

// 预设颜色
const PRESET_COLORS = [
  '#C0392B', '#E74C3C', '#FF6B6B', '#FFB3B3',
  '#E67E22', '#F39C12', '#FFB347', '#FFD93D',
  '#27AE60', '#2ECC71', '#58D68D', '#A9DFBF',
  '#2980B9', '#3498DB', '#5DADE2', '#AED6F1',
  '#8E44AD', '#9B59B6', '#AF7AC5', '#D2B4DE',
  '#1a237e', '#34495E', '#5D6D7E', '#85929E',
  '#8B4513', '#A0522D', '#CD853F', '#DEB887',
  '#00BCD4', '#00ACC1', '#26C6DA', '#80DEEA',
];

// 地形专用颜色
const TERRAIN_COLORS = {
  forest: '#228B22',
  desert: '#EDC9AF',
  mountain: '#808080',
  ocean: '#1E90FF',
  swamp: '#556B2F',
  snow: '#F0F8FF',
  volcano: '#8B0000',
};

const ColorPicker: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const drawingColor = useWorldStore((s) => s.drawingColor);
  const setDrawingColor = useWorldStore((s) => s.setDrawingColor);
  const activeLayerId = useWorldStore((s) => s.activeLayerId);
  const mapLayers = useWorldStore((s) => s.data.mapLayers ?? []);

  const activeLayer = mapLayers.find((l) => l.id === activeLayerId);
  const isReadOnly = activeLayer?.isReadOnly ?? false;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!isReadOnly) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleColorSelect = (color: string) => {
    setDrawingColor(color);
    handleClose();
  };

  const open = Boolean(anchorEl);
  const showTerrainColors = activeLayerId === 'terrain';
  const displayColors = showTerrainColors ? Object.values(TERRAIN_COLORS) : PRESET_COLORS;

  return (
    <>
      <Tooltip title="选择颜色" placement="right">
        <IconButton
          onClick={handleClick}
          disabled={isReadOnly}
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            p: 0.5,
            opacity: isReadOnly ? 0.5 : 1,
            position: 'relative',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
          }}
        >
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: 0.5,
              bgcolor: drawingColor,
              border: '1.5px solid rgba(0,0,0,0.25)',
            }}
          />
        </IconButton>
      </Tooltip>

      {/* Color picker popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: { p: 1.5, width: 240, borderRadius: 1.5 },
        }}
      >
        <Typography variant="caption" sx={{ color: '#1a237e', mb: 1, display: 'block', fontWeight: 600 }}>
          {showTerrainColors ? '🏔️ 地形颜色' : '选择颜色'}
        </Typography>

        {/* Color grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, mb: 1 }}>
          {displayColors.map((color) => (
            <Box
              key={color}
              onClick={() => handleColorSelect(color)}
              sx={{
                width: '100%',
                aspectRatio: '1',
                bgcolor: color,
                borderRadius: 0.5,
                cursor: 'pointer',
                border: '2px solid',
                borderColor: drawingColor === color ? 'primary.main' : 'transparent',
                transition: 'all 0.1s',
                '&:hover': { transform: 'scale(1.1)' },
              }}
            />
          ))}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Custom color */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">自定义:</Typography>
          <input
            type="color"
            value={drawingColor}
            onChange={(e) => setDrawingColor(e.target.value)}
            style={{ width: 32, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer' }}
          />
          <Typography
            variant="caption"
            sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.05)', px: 0.5, borderRadius: 0.25, fontSize: '0.65rem' }}
          >
            {drawingColor.toUpperCase()}
          </Typography>
        </Box>
      </Popover>
    </>
  );
};

export default ColorPicker;
