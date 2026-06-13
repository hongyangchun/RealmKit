import React from 'react';
import { Box } from '@mui/material';

interface JadeTokensProps {
  count: number;        // 勾玉数量 (1-8)
  size?: number;        // 单个勾玉大小 (px)，默认 28
  color?: string;       // 勾玉颜色，默认金色
}

/**
 * 勾玉组件 - 三国杀风格的阴阳鱼/勾玉形状
 * 用 CSS 实现，支持数量控制和大小调整
 */
const JadeTokens: React.FC<JadeTokensProps> = ({
  count,
  size = 28,
  color,
}) => {
  const jadeColor = color || '#DAA520';  // 默认金色
  const borderColor = '#8B6914';          // 深金色边框
  const innerColor = '#8B6914';          // 内部装饰颜色

  // 生成一个勾玉的样式（阴阳鱼简化版）
  const jadeStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: `radial-gradient(circle at 35% 35%, ${jadeColor}, ${borderColor})`,
    border: `2px solid ${borderColor}`,
    position: 'relative',
    display: 'inline-block',
    boxShadow: `inset 0 0 ${size*0.15}px rgba(0,0,0,0.3), 0 ${size*0.05}px ${size*0.1}px rgba(0,0,0,0.2)`,
  };

  // 阴阳鱼的内部装饰（小圆点）
  const innerDotStyle: React.CSSProperties = {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: size * 0.2,
    height: size * 0.2,
    borderRadius: '50%',
    background: innerColor,
  };

  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: Math.max(0, Math.min(8, count)) }, (_, i) => (
        <Box key={i} sx={jadeStyle}>
          <Box sx={innerDotStyle} />
        </Box>
      ))}
    </Box>
  );
};

export default JadeTokens;
