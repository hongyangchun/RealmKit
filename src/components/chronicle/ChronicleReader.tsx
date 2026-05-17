/**
 * ChronicleReader - 史书阅读器组件
 * 书卷展开效果，展示编年史内容
 */
import React from 'react';
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
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 0 60px rgba(139,105,20,0.1)',
          overflow: 'hidden',
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
          background: 'rgba(139,105,20,0.05)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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

      {/* 元信息 */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          px: 4,
          py: 2,
          borderBottom: '1px solid rgba(139,105,20,0.2)',
          flexWrap: 'wrap',
        }}
      >
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

      {/* 内容区域 */}
      <DialogContent
        sx={{
          p: 4,
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
              '& p': {
                textIndent: '2em',
                marginBottom: '1.2em',
              },
              // 首段不缩进
              '& p:first-of-type': {
                textIndent: 0,
              },
              // 段落间装饰
              '& p:not(:last-child)::after': {
                content: '"❧"',
                display: 'block',
                textAlign: 'center',
                color: '#8B6914',
                margin: '0.8em 0',
                fontSize: '1.2rem',
              },
            }}
          >
            {entry.content.split('\n\n').map((para, idx) => (
              <p key={idx}>{para}</p>
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
