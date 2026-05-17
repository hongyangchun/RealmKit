/**
 * MapCityMarker - 城市地图标记组件（React 叠加层）
 * 
 * 负责城市的视觉渲染和交互（拖拽移动、点击、hover 信息）
 * 使用网格坐标定位，跟随 Canvas 的 pan/zoom 变换
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Popover,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import type { City } from '../../types';
import { useWorldStore } from '../../store/worldStore';
import { CITY_TYPE_LABELS } from '../../constants/cityTypes';

interface MapCityMarkerProps {
  city: City;
  effectiveCellSize: number;
  onClick?: (city: City) => void;
  onDragEnd?: (cityId: string, gridX: number, gridY: number) => void;
  hitTest: (clientX: number, clientY: number) => { x: number; y: number } | null;
  /** 是否允许拖拽移动城市标记，默认 true */
  draggable?: boolean;
}

const MapCityMarker: React.FC<MapCityMarkerProps> = ({
  city,
  effectiveCellSize,
  onClick,
  onDragEnd,
  hitTest,
  draggable = true,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragGridPos, setDragGridPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const faction = useWorldStore((s) =>
    s.data.factions.find((f) => f.id === city.factionId)
  );

  const color = faction?.color ?? '#8B4513';
  const isCapital = city.isCapital;
  const currentPos = isDragging && dragGridPos ? dragGridPos : { x: city.gridX, y: city.gridY };

  // Visual sizing based on effectiveCellSize
  const markerRadius = isCapital
    ? Math.max(6, effectiveCellSize * 0.35)
    : Math.max(4, effectiveCellSize * 0.25);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!draggable) return; // 只读模式下不启动拖拽
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setAnchorEl(null);
  }, [draggable]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    const cell = hitTest(e.clientX, e.clientY);
    if (cell) {
      setDragGridPos({ x: cell.x, y: cell.y });
    }
  }, [isDragging, hitTest]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);

    if (dragGridPos && (dragGridPos.x !== city.gridX || dragGridPos.y !== city.gridY)) {
      onDragEnd?.(city.id, dragGridPos.x, dragGridPos.y);
    }
    setDragGridPos(null);
    dragStartRef.current = null;
  }, [isDragging, dragGridPos, city.id, city.gridX, city.gridY, onDragEnd]);

  // Global mouse move/up during drag (in case cursor leaves the element)
  useEffect(() => {
    if (!isDragging) return;

    const onGlobalMove = (e: MouseEvent) => {
      const cell = hitTest(e.clientX, e.clientY);
      if (cell) {
        setDragGridPos({ x: cell.x, y: cell.y });
      }
    };

    const onGlobalUp = (e: MouseEvent) => {
      setIsDragging(false);
      if (dragGridPos && (dragGridPos.x !== city.gridX || dragGridPos.y !== city.gridY)) {
        onDragEnd?.(city.id, dragGridPos.x, dragGridPos.y);
      }
      setDragGridPos(null);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', onGlobalMove);
    window.addEventListener('mouseup', onGlobalUp);
    return () => {
      window.removeEventListener('mousemove', onGlobalMove);
      window.removeEventListener('mouseup', onGlobalUp);
    };
  }, [isDragging, dragGridPos, city.id, city.gridX, city.gridY, hitTest, onDragEnd]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    e.stopPropagation();
    onClick?.(city);
  }, [isDragging, city, onClick]);

  return (
    <Box
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onMouseEnter={(e) => !isDragging && setAnchorEl(e.currentTarget)}
      onMouseLeave={() => !isDragging && setAnchorEl(null)}
      sx={{
        position: 'absolute',
        left: (currentPos.x + 0.5) * effectiveCellSize,
        top: (currentPos.y + 0.5) * effectiveCellSize,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : (draggable ? 'grab' : 'pointer'),
        zIndex: isDragging ? 30 : 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: isDragging ? 'none' : 'transform 0.1s',
        '&:hover': isDragging ? {} : { transform: 'translate(-50%, -50%) scale(1.15)' },
        userSelect: 'none',
      }}
    >
      {/* City marker circle */}
      <Box
        sx={{
          width: markerRadius * 2,
          height: markerRadius * 2,
          borderRadius: '50%',
          background: color,
          border: `2px solid #fff`,
          boxShadow: `0 1px 4px rgba(0,0,0,0.3)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {isCapital && (
          <StarIcon
            sx={{
              fontSize: markerRadius * 0.9,
              color: '#FFD700',
              position: 'absolute',
              top: -markerRadius * 0.6,
              right: -markerRadius * 0.4,
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
            }}
          />
        )}
      </Box>

      {/* Gold ring for capitals */}
      {isCapital && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: markerRadius * 2 + 6,
            height: markerRadius * 2 + 6,
            borderRadius: '50%',
            border: '2px solid #FFD700',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* City name label */}
      <Typography
        variant="caption"
        sx={{
          fontSize: Math.max(7, Math.min(11, effectiveCellSize * 0.9)),
          fontWeight: isCapital ? 700 : 600,
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          px: 0.6,
          py: 0.1,
          borderRadius: 2,
          whiteSpace: 'nowrap',
          mt: 0.3,
          lineHeight: 1.2,
          textAlign: 'center',
        }}
      >
        {city.name}
      </Typography>

      {/* Hover popover (non-dragging only) */}
      {!isDragging && (
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
            {city.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {CITY_TYPE_LABELS[city.type] ?? city.type}
            {faction && ` · ${faction.name}`}
          </Typography>
          {city.population != null && (
            <Typography variant="caption" display="block">
              人口：{city.population.toLocaleString()}
            </Typography>
          )}
          <Typography variant="caption" display="block">
            坐标：({city.gridX}, {city.gridY})
          </Typography>
        </Popover>
      )}
    </Box>
  );
};

export default MapCityMarker;
