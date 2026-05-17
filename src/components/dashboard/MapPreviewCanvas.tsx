/**
 * MapPreviewCanvas - 向导中的迷你地图预览画布
 * 只读预览，展示生成的地形和领地
 */
import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import type { TerrainCell, TerritoryCell } from '../../types';

interface MapPreviewCanvasProps {
  terrainCells: TerrainCell[];
  territoryCells: TerritoryCell[];
  canvasSize?: number; // 画布尺寸（正方形），默认 280
}

const MapPreviewCanvas: React.FC<MapPreviewCanvasProps> = ({
  terrainCells,
  territoryCells,
  canvasSize = 280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridSize = 100;
    const cellPx = canvasSize / gridSize;

    // 背景：深海色
    ctx.fillStyle = '#1a5276';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // 1. 渲染地形层（全透明度）
    for (const tc of terrainCells) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = tc.color;
      ctx.fillRect(tc.x * cellPx, tc.y * cellPx, Math.ceil(cellPx), Math.ceil(cellPx));
    }

    // 2. 渲染领地层（半透明叠加）
    ctx.globalAlpha = 0.55;
    for (const tc of territoryCells) {
      ctx.fillStyle = tc.color;
      ctx.fillRect(tc.x * cellPx, tc.y * cellPx, Math.ceil(cellPx), Math.ceil(cellPx));
    }

    ctx.globalAlpha = 1;
  }, [terrainCells, territoryCells, canvasSize]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        style={{
          borderRadius: 8,
          border: '2px solid rgba(26,35,126,0.2)',
          imageRendering: 'pixelated',
        }}
      />
    </Box>
  );
};

export default MapPreviewCanvas;
