/**
 * MapPage - 世界地图页
 *
 * 全屏交互式世界地图，承载所有空间信息。
 * 自带查看/编辑模式切换，无需跳转到独立页面。
 *
 * 模式：
 * - 查看模式：拖拽平移 + 滚轮/按钮缩放，点击标记弹窗详情
 * - 编辑模式：绘制工具 + 图层管理 + 图钉编辑，就地切换
 */
import React from 'react';
import { Box } from '@mui/material';
import MapViewer from '../components/map/MapViewer';
import CanvasErrorBoundary from '../components/common/CanvasErrorBoundary';

// ─── 主组件 ──────────────────────────────────────────────────────────────────

const MapPage: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
      }}
    >
      <CanvasErrorBoundary label="世界地图">
        <MapViewer />
      </CanvasErrorBoundary>
    </Box>
  );
};

export default MapPage;
