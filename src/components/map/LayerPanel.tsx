/**
 * LayerPanel - 图层管理面板
 * 显示所有图层，支持显示/隐藏、透明度调节
 * 手风琴式折叠面板，减少垂直空间占用
 * viewOnly 模式：仅显示图层可见性和透明度控制（用于查看模式）
 */
import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Slider,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useWorldStore } from '../../store/worldStore';
import type { MapLayer, LayerId } from '../../types';

const LAYER_COLORS: Record<LayerId, string> = {
  territory: '#1a237e',
  city: '#8B4513',
  terrain: '#228B22',
  event: '#C0392B',
  pin: '#f39c12',
};

const LAYER_ICONS: Record<LayerId, string> = {
  territory: '🏰',
  city: '🏛️',
  terrain: '🏔️',
  event: '📜',
  pin: '📍',
};

interface LayerItemProps {
  layer: MapLayer;
  isActive: boolean;
  viewOnly?: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onOpacityChange: (opacity: number) => void;
  defaultExpanded?: boolean;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  isActive,
  viewOnly = false,
  onSelect,
  onToggleVisibility,
  onOpacityChange,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const handleOpacityChange = (_: Event, value: number | number[]) => {
    onOpacityChange((value as number) / 100);
  };

  // viewOnly 模式下：可点击展开透明度，不可选中图层
  // 编辑模式下：isReadOnly 图层不可选中，不可展开
  const canSelect = !viewOnly && !layer.isReadOnly;
  const canExpand = viewOnly || (!layer.isReadOnly && layer.visible);

  return (
    <Box
      onClick={() => {
        if (canExpand && layer.visible) {
          setExpanded(!expanded);
        }
        if (canSelect) {
          onSelect();
        }
      }}
      sx={{
        px: 1,
        py: 0.5,
        borderRadius: 1,
        cursor: canExpand && layer.visible ? 'pointer' : 'default',
        bgcolor: isActive && !viewOnly ? 'rgba(26, 35, 126, 0.08)' : 'transparent',
        border: '1px solid',
        borderColor: isActive && !viewOnly ? 'rgba(26, 35, 126, 0.2)' : 'transparent',
        transition: 'all 0.15s',
        '&:hover': {
          bgcolor: canExpand && layer.visible ? 'rgba(0,0,0,0.03)' : 'transparent',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {canExpand && layer.visible && (
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            sx={{ p: 0, width: 18, height: 18 }}
          >
            {expanded
              ? <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
              : <KeyboardArrowRightIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        )}
        {!(canExpand && layer.visible) && <Box sx={{ width: 18 }} />}

        <Typography sx={{ fontSize: '0.85rem' }}>
          {LAYER_ICONS[layer.id]}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            flex: 1,
            fontWeight: isActive && !viewOnly ? 600 : 400,
            color: isActive && !viewOnly ? 'primary.main' : 'text.primary',
            fontSize: '0.8rem',
            lineHeight: '20px',
          }}
        >
          {layer.name}
        </Typography>

        <Tooltip title={layer.visible ? '隐藏图层' : '显示图层'}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
            sx={{ p: 0.25 }}
          >
            {layer.visible ? (
              <VisibilityIcon sx={{ fontSize: 16 }} />
            ) : (
              <VisibilityOffIcon sx={{ fontSize: 16, opacity: 0.4 }} />
            )}
          </IconButton>
        </Tooltip>

        {!viewOnly && layer.isReadOnly && (
          <LockIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.5 }} />
        )}
      </Box>

      {/* Expanded controls: 透明度 */}
      {expanded && layer.visible && canExpand && (
        <Box sx={{ mt: 0.5, pl: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ width: 24, fontSize: '0.65rem' }}>
              透明
            </Typography>
            <Slider
              size="small"
              value={Math.round(layer.opacity * 100)}
              onChange={handleOpacityChange}
              onClick={(e) => e.stopPropagation()}
              sx={{
                flex: 1,
                '& .MuiSlider-thumb': { width: 10, height: 10 },
                '& .MuiSlider-track': { background: LAYER_COLORS[layer.id] },
                '& .MuiSlider-rail': { background: 'rgba(0,0,0,0.1)' },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ width: 24, textAlign: 'right', fontSize: '0.65rem' }}>
              {Math.round(layer.opacity * 100)}%
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

interface LayerPanelProps {
  /** 查看模式：仅显示图层可见性和透明度，不显示选中/清空 */
  viewOnly?: boolean;
}

const LayerPanel: React.FC<LayerPanelProps> = ({ viewOnly = false }) => {
  const mapLayers = useWorldStore((s) => s.data.mapLayers ?? []);
  const activeLayerId = useWorldStore((s) => s.activeLayerId);
  const setActiveLayerId = useWorldStore((s) => s.setActiveLayerId);
  const updateLayer = useWorldStore((s) => s.updateLayer);

  const handleToggleVisibility = (layerId: LayerId) => {
    const layer = mapLayers.find((l) => l.id === layerId);
    if (layer) {
      updateLayer(layerId, { visible: !layer.visible });
    }
  };

  const handleOpacityChange = (layerId: LayerId, opacity: number) => {
    updateLayer(layerId, { opacity });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {mapLayers.map((layer) => (
        <LayerItem
          key={layer.id}
          layer={layer}
          isActive={layer.id === activeLayerId}
          viewOnly={viewOnly}
          onSelect={() => !layer.isReadOnly && setActiveLayerId(layer.id)}
          onToggleVisibility={() => handleToggleVisibility(layer.id)}
          onOpacityChange={(opacity) => handleOpacityChange(layer.id, opacity)}
          defaultExpanded={layer.id === activeLayerId}
        />
      ))}
    </Box>
  );
};

export default LayerPanel;
