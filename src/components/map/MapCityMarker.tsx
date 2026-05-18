/**
 * MapCityMarker - 城市地图标记组件（React 叠加层）
 * 
 * 负责城市的视觉渲染和交互（拖拽移动、点击、hover 信息）
 * 使用网格坐标定位，跟随 Canvas 的 pan/zoom 变换
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Popover,
  keyframes,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import ShieldIcon from '@mui/icons-material/Shield';
import SailingIcon from '@mui/icons-material/Sailing';
import TempleBuddhistIcon from '@mui/icons-material/TempleBuddhist';
import HomeIcon from '@mui/icons-material/Home';
import type { City } from '../../types';
import { useWorldStore } from '../../store/worldStore';
import { CITY_TYPE_LABELS } from '../../constants/cityTypes';

// ─── 叙事微动画 ───────────────────────────────────────────

/** 国都金色光晕脉冲 */
const capitalGlow = keyframes`
  0%, 100% { box-shadow: 0 0 4px rgba(255,215,0,0.3); }
  50% { box-shadow: 0 0 12px rgba(255,215,0,0.6), 0 0 4px rgba(255,215,0,0.2); }
`;

/** 圣地神秘光晕 */
const holyGlow = keyframes`
  0%, 100% { box-shadow: 0 0 4px rgba(127,119,221,0.2); }
  50% { box-shadow: 0 0 10px rgba(127,119,221,0.4), 0 0 3px rgba(127,119,221,0.15); }
`;

// ─── 城市类型视觉符号 ─────────────────────────────────────

function CityTypeIcon({ type, size }: { type: City['type']; size: number }) {
  const iconProps = { sx: { fontSize: size * 0.8, color: '#fff' } };

  switch (type) {
    case 'capital':
      return <StarIcon {...iconProps} />;
    case 'fortress':
      return <ShieldIcon {...iconProps} />;
    case 'port':
      return <SailingIcon {...iconProps} />;
    case 'holy_site':
      return <TempleBuddhistIcon {...iconProps} />;
    case 'village':
    default:
      return <HomeIcon {...iconProps} />;
  }
}

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

  // 叙事信息：关联事件统计与最近事件
  const cityEvents = useWorldStore(useMemo(() => (s) =>
    s.data.events.filter((e) => e.cityId === city.id),
    [city.id]
  ));

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
      {/* City marker circle — 类型化图标 + 叙事光晕 */}
      <Box
        sx={{
          width: markerRadius * 2,
          height: markerRadius * 2,
          borderRadius: '50%',
          background: color,
          border: isCapital
            ? '2px solid #FFD700'
            : city.type === 'holy_site'
              ? '2px solid rgba(127,119,221,0.7)'
              : '2px solid #fff',
          boxShadow: isCapital
            ? '0 0 8px rgba(255,215,0,0.4), 0 1px 4px rgba(0,0,0,0.3)'
            : city.type === 'holy_site'
              ? '0 0 6px rgba(127,119,221,0.3), 0 1px 4px rgba(0,0,0,0.3)'
              : '0 1px 4px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          animation: isCapital
            ? `${capitalGlow} 2.5s ease-in-out infinite`
            : city.type === 'holy_site'
              ? `${holyGlow} 3s ease-in-out infinite`
              : 'none',
        }}
      >
        <CityTypeIcon type={city.type} size={markerRadius * 2} />
      </Box>

      {/* 国都金色外环 */}
      {isCapital && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: markerRadius * 2 + 8,
            height: markerRadius * 2 + 8,
            borderRadius: '50%',
            border: '2px solid #FFD700',
            pointerEvents: 'none',
            opacity: 0.7,
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
          {city.description && (
            <Box sx={{ mt: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {city.description}
              </Typography>
            </Box>
          )}
          {city.population != null && (
            <Typography variant="caption" display="block" sx={{ mt: 0.3 }}>
              人口：{city.population.toLocaleString()}
            </Typography>
          )}
          {/* 叙事事件摘要 */}
          {cityEvents.length > 0 && (
            <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                📜 关联事件 ({cityEvents.length})
              </Typography>
              {cityEvents.slice(-2).reverse().map((evt) => (
                <Typography
                  key={evt.id}
                  variant="caption"
                  display="block"
                  sx={{ color: 'text.secondary', lineHeight: 1.4, mt: 0.2 }}
                >
                  · {evt.year}年 — {evt.title}
                </Typography>
              ))}
            </Box>
          )}
          <Typography variant="caption" display="block" sx={{ mt: 0.3, color: 'text.disabled' }}>
            坐标：({city.gridX}, {city.gridY})
          </Typography>
        </Popover>
      )}
    </Box>
  );
};

export default MapCityMarker;
