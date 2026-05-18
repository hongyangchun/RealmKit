/**
 * ChronicleReader - 史书阅读器组件
 * 书卷展开效果，展示编年史内容
 *
 * 视觉叙事增强：
 *   - 卷轴光影深度感（内发光 + 纸张纹理）
 *   - 首字下沉（drop cap）装饰
 *   - 章节分隔装饰纹
 *   - 年代标尺时间线
 */
import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Fade,
  Zoom,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { useSFX } from '../../hooks/useSFX';
import type { ChronicleEntry } from '../../types';

interface ChronicleReaderProps {
  open: boolean;
  entry: ChronicleEntry | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (entry: ChronicleEntry) => void;
}

const ChronicleReader: React.FC<ChronicleReaderProps> = ({
  open,
  entry,
  onClose,
  onDelete,
  onEdit,
}) => {
  const sfx = useSFX();

  // 卷轴展开音效
  useEffect(() => {
    if (open && entry) {
      sfx.play('sfx/chronicle_scroll');
    }
  }, [open, entry]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry) return null;

  // 格式化时间显示
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #faf3e0 0%, #f5e6c8 50%, #efe0b8 100%)',
          borderRadius: 3,
          border: '3px solid #8B6914',
          boxShadow: `
            0 8px 32px rgba(0,0,0,0.3),
            inset 0 0 80px rgba(139,105,20,0.08),
            inset 0 2px 0 rgba(255,255,255,0.3),
            inset 0 -2px 0 rgba(0,0,0,0.05)
          `,
          overflow: 'hidden',
          position: 'relative',
          // 纸张纹理叠加
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
            pointerEvents: 'none',
            zIndex: 0,
          },
        },
      }}
      TransitionComponent={Zoom}
      transitionDuration={300}
    >
      {/* 装饰性书卷顶部 */}
      <Box
        sx={{
          position: 'relative',
          height: 24,
          background: 'linear-gradient(to bottom, #8B6914 0%, #D4A84B 50%, #8B6914 100%)',
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4A84B 0%, #8B6914 100%)',
          },
          '&::before': { left: -12 },
          '&::after': { right: -12 },
        }}
      />

      {/* 头部 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 4,
          py: 2,
          borderBottom: '1px solid rgba(139,105,20,0.3)',
          background: 'linear-gradient(180deg, rgba(139,105,20,0.08) 0%, transparent 100%)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AutoStoriesIcon sx={{ fontSize: 28, color: '#8B6914', opacity: 0.7 }} />
          <Typography
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontSize: '1.8rem',
              color: '#5D4037',
              fontWeight: 700,
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            {entry.title}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {onEdit && (
            <IconButton
              onClick={() => onEdit(entry)}
              size="small"
              sx={{
                color: '#8B6914',
                '&:hover': { background: 'rgba(139,105,20,0.1)' },
              }}
            >
              <EditIcon />
            </IconButton>
          )}
          {onDelete && (
            <IconButton
              onClick={() => {
                onDelete(entry.id);
                onClose();
              }}
              size="small"
              sx={{
                color: '#C62828',
                '&:hover': { background: 'rgba(198,40,40,0.1)' },
              }}
            >
              <DeleteOutlineIcon />
            </IconButton>
          )}
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: '#5D4037',
              '&:hover': { background: 'rgba(93,64,55,0.1)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* 元信息 + 年代标尺 */}
      <Box
        sx={{
          px: 4,
          py: 2,
          borderBottom: '1px solid rgba(139,105,20,0.2)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
          <Chip
            label={`第 ${entry.startYear} 年 至 第 ${entry.endYear} 年`}
            size="small"
            sx={{
              background: 'linear-gradient(135deg, #ffd54f 0%, #D4A84B 100%)',
              color: '#3E2723',
              fontWeight: 600,
              fontFamily: "'LXGW WenKai TC', serif",
            }}
          />
          <Chip
            label={`记录于 ${formatDate(entry.createdAt)}`}
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'rgba(139,105,20,0.5)',
              color: '#5D4037',
            }}
          />
        </Box>
        {/* 年代标尺时间线 */}
        <Box sx={{ position: 'relative', height: 8, mx: 1 }}>
          <Box
            sx={{
              position: 'absolute',
              top: 3,
              left: 0,
              right: 0,
              height: 2,
              background: 'linear-gradient(90deg, transparent 0%, #D4A84B 10%, #D4A84B 90%, transparent 100%)',
              borderRadius: 1,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: `${((entry.startYear) / (entry.endYear + 10)) * 100}%`,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#8B6914',
              border: '2px solid #faf3e0',
              boxShadow: '0 0 4px rgba(139,105,20,0.4)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: `${((entry.endYear) / (entry.endYear + 10)) * 100}%`,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#8B6914',
              border: '2px solid #faf3e0',
              boxShadow: '0 0 4px rgba(139,105,20,0.4)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 3,
              left: `${((entry.startYear) / (entry.endYear + 10)) * 100}%`,
              width: `${((entry.endYear - entry.startYear) / (entry.endYear + 10)) * 100}%`,
              height: 2,
              background: 'linear-gradient(90deg, #ffd54f, #8B6914)',
              borderRadius: 1,
            }}
          />
        </Box>
      </Box>

      {/* 内容区域 */}
      <DialogContent
        sx={{
          p: 4,
          position: 'relative',
          zIndex: 1,
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(139,105,20,0.1)',
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(139,105,20,0.4)',
            borderRadius: 4,
            '&:hover': {
              background: 'rgba(139,105,20,0.6)',
            },
          },
        }}
      >
        <Fade in timeout={500}>
          <Box
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontSize: '1.1rem',
              lineHeight: 2.2,
              color: '#3E2723',
              textAlign: 'justify',
              whiteSpace: 'pre-wrap',
            }}
          >
            {entry.content.split('\n\n').map((para, idx) => (
              <Box
                key={idx}
                component="p"
                sx={{
                  textIndent: idx === 0 ? 0 : '2em',
                  marginBottom: '1.2em',
                  marginTop: 0,
                  // 首字下沉效果（仅首段首字）
                  ...(idx === 0 && para.length > 0
                    ? {
                        '&::first-letter': {
                          fontSize: '3em',
                          fontWeight: 700,
                          float: 'left',
                          lineHeight: 1,
                          marginRight: 0.08,
                          marginTop: 0.05,
                          color: '#8B6914',
                          textShadow: '1px 1px 2px rgba(139,105,20,0.3)',
                        },
                      }
                    : {}),
                  '&:not(:last-child)::after': {
                    content: '"❧"',
                    display: 'block',
                    textAlign: 'center',
                    color: '#8B6914',
                    margin: '0.8em 0',
                    fontSize: '1.2rem',
                    opacity: 0.6,
                  },
                }}
              >
                {para}
              </Box>
            ))}
          </Box>
        </Fade>
      </DialogContent>

      {/* 装饰性书卷底部 */}
      <Box
        sx={{
          position: 'relative',
          height: 24,
          background: 'linear-gradient(to bottom, #8B6914 0%, #D4A84B 50%, #8B6914 100%)',
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4A84B 0%, #8B6914 100%)',
          },
          '&::before': { left: -12 },
          '&::after': { right: -12 },
        }}
      />
    </Dialog>
  );
};

export default ChronicleReader;
