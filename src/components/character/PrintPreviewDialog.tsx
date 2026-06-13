/**
 * PrintPreviewDialog - 打印预览对话框
 *
 * 功能:
 * - 缩放预览所有 A4 页面
 * - 显示卡片数量统计
 * - 打印按钮 (触发 window.print)
 * - 支持全屏模式切换
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Slider,
  Tooltip,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CharacterCardPrintContainer, { printCharacterCards } from './CharacterCardPrintSheet';
import type { Character, Faction } from '../../types';

interface PrintPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  characters: { character: Character; faction: Faction | undefined }[];
}

const ZOOM_MIN = 20;
const ZOOM_MAX = 150;
const ZOOM_STEP = 5;
const ZOOM_DEFAULT = 40;

const PrintPreviewDialog: React.FC<PrintPreviewDialogProps> = ({ open, onClose, characters }) => {
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [fullscreen, setFullscreen] = useState(false);

  const totalCards = characters.length;
  const sheets = Math.ceil(totalCards / 9);

  const handlePrint = useCallback(() => {
    printCharacterCards(characters);
  }, [characters]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setFullscreen((f) => !f);
    setZoom(fullscreen ? ZOOM_DEFAULT : 55); // 全屏时放大到 55%
  }, [fullscreen]);

  const dialogSx = useMemo(() => {
    if (fullscreen) {
      return {
        '& .MuiDialog-paper': {
          maxWidth: '100vw !important',
          maxHeight: '100vh !important',
          width: '100vw',
          height: '100vh',
          margin: 0,
          borderRadius: 0,
        },
      };
    }
    return {
      '& .MuiDialog-paper': {
        maxWidth: '95vw',
        maxHeight: '90vh',
        width: '90vw',
        height: '85vh',
      },
    };
  }, [fullscreen]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      sx={dialogSx}
    >
      {/* 工具栏 */}
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2,
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        fontFamily: "'LXGW WenKai TC',serif",
        fontSize: '1.1rem',
        background: '#f5f5f5',
      }}>
        <PrintIcon sx={{ color: '#1a237e' }} />
        <Typography variant="h6" sx={{ flex: 1, fontSize: '1rem', fontWeight: 600 }}>
          打印预览 — 三国杀人物卡牌
        </Typography>

        {/* 信息 */}
        <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
          {totalCards} 张卡片 / {sheets} 页
        </Typography>

        {/* 缩放控制 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="缩小">
            <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= ZOOM_MIN}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Slider
            value={zoom}
            onChange={(_, v) => setZoom(v as number)}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            size="small"
            sx={{ width: 80 }}
          />
          <Tooltip title="放大">
            <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= ZOOM_MAX}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'center' }}>
            {zoom}%
          </Typography>
        </Box>

        {/* 全屏切换 */}
        <Tooltip title={fullscreen ? '退出全屏' : '全屏预览'}>
          <IconButton size="small" onClick={handleToggleFullscreen}>
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>

        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* 预览内容 */}
      <DialogContent sx={{
        p: 0,
        background: '#c0c0c0',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        py: 4,
      }}>
        {/* 缩放容器 */}
        <Box sx={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
        }}>
          <CharacterCardPrintContainer characters={characters} preview />
        </Box>
      </DialogContent>

      {/* 底部操作栏 */}
      <DialogActions sx={{
        px: 3,
        py: 1.5,
        borderTop: '1px solid rgba(0,0,0,0.1)',
        background: '#f5f5f5',
        gap: 1,
      }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ textTransform: 'none', borderColor: '#ccc', color: '#666' }}
        >
          取消
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          sx={{
            textTransform: 'none',
            background: '#1a237e',
            '&:hover': { background: '#283593' },
          }}
        >
          打印 ({totalCards} 张卡片)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintPreviewDialog;
