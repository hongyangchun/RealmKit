/**
 * ChronicleForm - 编年史生成表单
 * 选择时间范围，触发 AI 生成
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Slider,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { WorldData } from '../../types';

interface ChronicleFormProps {
  open: boolean;
  worldData: WorldData;
  isGenerating: boolean;
  error: string | null;
  onGenerate: (startYear: number, endYear: number, title: string) => void;
  onClose: () => void;
}

const ChronicleForm: React.FC<ChronicleFormProps> = ({
  open,
  worldData,
  isGenerating,
  error,
  onGenerate,
  onClose,
}) => {
  // 计算世界的年份范围
  const events = worldData.events;
  const characters = worldData.characters;

  let minYear = 1;
  let maxYear = 100;

  if (events.length > 0) {
    const eventYears = events.map((e) => e.year);
    minYear = Math.min(...eventYears);
    maxYear = Math.max(...eventYears);
  }

  if (characters.length > 0) {
    const charYears = characters
      .map((c) => [c.birthYear, c.deathYear])
      .flat()
      .filter((y): y is number => y !== undefined);
    if (charYears.length > 0) {
      minYear = Math.min(minYear, ...charYears);
      maxYear = Math.max(maxYear, ...charYears);
    }
  }

  // 确保范围合理
  if (maxYear <= minYear) {
    maxYear = minYear + 50;
  }

  // 初始值设为中点
  const [startYear, setStartYear] = useState(minYear);
  const [endYear, setEndYear] = useState(Math.min(maxYear, minYear + 30));
  const [customTitle, setCustomTitle] = useState('');
  const [titleMode, setTitleMode] = useState<'auto' | 'custom'>('auto');

  const handleGenerate = () => {
    const title =
      titleMode === 'custom' && customTitle.trim()
        ? customTitle.trim()
        : `第 ${startYear} 至 ${endYear} 年纪事`;

    onGenerate(startYear, endYear, title);
  };

  const handleReset = () => {
    setStartYear(minYear);
    setEndYear(Math.min(maxYear, minYear + 30));
    setCustomTitle('');
    setTitleMode('auto');
  };

  return (
    <Dialog
      open={open}
      onClose={isGenerating ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(145deg, #faf3e0 0%, #f0e2c4 100%)',
          borderRadius: 3,
          border: '2px solid #8B6914',
          boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          fontFamily: "'LXGW WenKai TC', serif",
          color: '#3E2723',
          borderBottom: '1px solid rgba(139,105,20,0.3)',
          py: 2,
        }}
      >
        <AutoStoriesIcon sx={{ color: '#8B6914', fontSize: 32 }} />
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, fontFamily: "'LXGW WenKai TC', serif" }}
        >
          书写编年史
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {/* 提示信息 */}
        <Alert
          severity="info"
          sx={{
            mb: 3,
            background: 'rgba(255,213,79,0.15)',
            border: '1px solid rgba(139,105,20,0.3)',
            '& .MuiAlert-icon': { color: '#8B6914' },
          }}
        >
          <Typography variant="body2">
            AI 将根据世界中已有的势力、人物和事件，生成一段富有文学性的编年史叙事。
          </Typography>
        </Alert>

        {/* 时间范围选择 */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            background: 'rgba(139,105,20,0.05)',
            borderRadius: 2,
            border: '1px solid rgba(139,105,20,0.2)',
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 600,
              color: '#5D4037',
              mb: 2,
            }}
          >
            选择时间范围
          </Typography>

          {/* 起始年 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              起始年：<strong>{startYear}</strong>
            </Typography>
            <Slider
              value={startYear}
              onChange={(_, v) => setStartYear(v as number)}
              min={minYear}
              max={maxYear}
              step={1}
              disabled={isGenerating}
              sx={{
                color: '#D4A84B',
                '& .MuiSlider-thumb': {
                  background: '#8B6914',
                },
                '& .MuiSlider-track': {
                  background: 'linear-gradient(90deg, #D4A84B, #8B6914)',
                },
              }}
            />
          </Box>

          {/* 结束年 */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              结束年：<strong>{endYear}</strong>
            </Typography>
            <Slider
              value={endYear}
              onChange={(_, v) => setEndYear(v as number)}
              min={startYear}
              max={maxYear}
              step={1}
              disabled={isGenerating}
              sx={{
                color: '#D4A84B',
                '& .MuiSlider-thumb': {
                  background: '#8B6914',
                },
                '& .MuiSlider-track': {
                  background: 'linear-gradient(90deg, #D4A84B, #8B6914)',
                },
              }}
            />
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1 }}
          >
            世界事件跨度：第 {minYear} 年 至 第 {maxYear} 年
          </Typography>
        </Paper>

        {/* 标题设置 */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel sx={{ color: '#5D4037' }}>标题命名方式</InputLabel>
          <Select
            value={titleMode}
            label="标题命名方式"
            onChange={(e) => setTitleMode(e.target.value as 'auto' | 'custom')}
            disabled={isGenerating}
            sx={{
              background: 'rgba(255,255,255,0.5)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(139,105,20,0.5)',
              },
            }}
          >
            <MenuItem value="auto">自动生成（如「第 1 至 30 年纪事」）</MenuItem>
            <MenuItem value="custom">自定义标题</MenuItem>
          </Select>
        </FormControl>

        {titleMode === 'custom' && (
          <TextField
            fullWidth
            label="史书标题"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="如：第一纪元·开元记"
            disabled={isGenerating}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                background: 'rgba(255,255,255,0.5)',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(139,105,20,0.5)',
              },
            }}
          />
        )}

        {/* 预览标题 */}
        <Divider sx={{ my: 2, borderColor: 'rgba(139,105,20,0.2)' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            史书标题：
          </Typography>
          <Typography
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 600,
              color: '#8B6914',
            }}
          >
            {titleMode === 'custom' && customTitle.trim()
              ? customTitle.trim()
              : `第 ${startYear} 至 ${endYear} 年纪事`}
          </Typography>
        </Box>

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={handleReset}
          disabled={isGenerating}
          sx={{ color: '#8B6914' }}
        >
          重置
        </Button>
        <Button
          onClick={onClose}
          disabled={isGenerating}
          sx={{ color: '#5D4037' }}
        >
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={isGenerating || (titleMode === 'custom' && !customTitle.trim())}
          startIcon={
            isGenerating ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <AutoAwesomeIcon />
            )
          }
          sx={{
            background: 'linear-gradient(135deg, #8B6914 0%, #D4A84B 100%)',
            color: '#fff',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #6B4F10 0%, #B8860B 100%)',
            },
            '&:disabled': {
              background: 'rgba(139,105,20,0.3)',
            },
          }}
        >
          {isGenerating ? '书写中...' : '开始书写'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChronicleForm;
