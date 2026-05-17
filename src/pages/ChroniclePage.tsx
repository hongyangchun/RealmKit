/**
 * ChroniclePage - 编年史页面
 * 展示史书列表，触发 AI 生成新编年史
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Fab,
  Fade,
  Zoom,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
} from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

import { useChronicles } from '../hooks/useChronicles';
import { useAiConfig } from '../hooks/useAiConfig';
import { useWorldStore } from '../store/worldStore';
import { aiService } from '../services/aiService';
import ChronicleReader from '../components/chronicle/ChronicleReader';
import ChronicleForm from '../components/chronicle/ChronicleForm';
import AiSettingsDialog from '../components/chronicle/AiSettingsDialog';
import SettingsDialog from '../components/layout/SettingsDialog';
import type { ChronicleEntry } from '../types';

const ChroniclePage: React.FC = () => {
  const navigate = useNavigate();
  const { chronicles, createChronicle, updateChronicle, deleteChronicle } = useChronicles();
  const { config, saveConfig } = useAiConfig();
  const { data: worldData } = useWorldStore();

  // 状态
  const [selectedEntry, setSelectedEntry] = useState<ChronicleEntry | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // 编辑状态
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ChronicleEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // 菜单状态
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuEntry, setMenuEntry] = useState<ChronicleEntry | null>(null);

  // 排序编年史（按创建时间倒序）
  const sortedChronicles = useMemo(
    () => [...chronicles].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [chronicles]
  );

  // 打开阅读器
  const handleOpenReader = (entry: ChronicleEntry) => {
    setSelectedEntry(entry);
    setReaderOpen(true);
  };

  // 打开编辑表单
  const handleOpenEdit = (entry: ChronicleEntry) => {
    setEditEntry(entry);
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setEditOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editEntry && editTitle.trim()) {
      updateChronicle(editEntry.id, {
        title: editTitle.trim(),
        content: editContent,
      });
      setEditOpen(false);
      setEditEntry(null);
    }
  };

  // 生成编年史
  const handleGenerate = async (startYear: number, endYear: number, title: string) => {
    if (!config || !aiService.validateConfig(config)) {
      setSettingsOpen(true);
      setGenerationError('请先配置 AI 设置');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const content = await aiService.generateChronicle(config, worldData, startYear, endYear);

      // 保存到编年史
      const newEntry = createChronicle({
        title,
        startYear,
        endYear,
        content,
        createdAt: new Date().toISOString(),
      });

      // 打开新生成的史书
      setSelectedEntry(newEntry);
      setReaderOpen(true);
      setFormOpen(false);
    } catch (error) {
      console.error('生成编年史失败:', error);
      setGenerationError(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 删除编年史
  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这篇编年史吗？')) {
      deleteChronicle(id);
    }
  };

  // 菜单操作
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, entry: ChronicleEntry) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuEntry(entry);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuEntry(null);
  };

  // 格式化日期
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 预览内容（截取前100字）
  const getPreview = (content: string) => {
    const cleaned = content.replace(/\n+/g, ' ').trim();
    return cleaned.length > 120 ? cleaned.slice(0, 120) + '...' : cleaned;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 头部 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AutoStoriesIcon sx={{ fontSize: 36, color: '#8B6914' }} />
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontFamily: "'LXGW WenKai TC', serif",
                fontWeight: 700,
                color: '#3E2723',
              }}
            >
              世界编年史
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {chronicles.length} 篇史书
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setGlobalSettingsOpen(true)}
            sx={{
              borderColor: 'rgba(139,105,20,0.5)',
              color: '#8B6914',
              '&:hover': {
                borderColor: '#8B6914',
                background: 'rgba(139,105,20,0.05)',
              },
            }}
          >
            AI 配置
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setFormOpen(true)}
            disabled={worldData.factions.length === 0 && worldData.characters.length === 0}
            sx={{
              background: 'linear-gradient(135deg, #8B6914 0%, #D4A84B 100%)',
              color: '#fff',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #6B4F10 0%, #B8860B 100%)',
              },
            }}
          >
            书写新篇
          </Button>
        </Box>
      </Box>

      {/* 空状态提示 */}
      {chronicles.length === 0 && (
        <Fade in timeout={500}>
          <Card
            sx={{
              textAlign: 'center',
              py: 8,
              background: 'linear-gradient(145deg, #faf3e0 0%, #f0e2c4 100%)',
              border: '2px dashed rgba(139,105,20,0.4)',
              borderRadius: 3,
            }}
          >
            <CardContent>
              <AutoStoriesIcon sx={{ fontSize: 72, color: 'rgba(139,105,20,0.3)', mb: 2 }} />
              <Typography
                variant="h6"
                sx={{ fontFamily: "'LXGW WenKai TC', serif", color: '#5D4037', mb: 1 }}
              >
                暂无史书
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {worldData.factions.length === 0 && worldData.characters.length === 0
                  ? '请先添加势力或人物，再来书写编年史'
                  : '点击「书写新篇」让 AI 为你生成一段精彩的世界叙事'}
              </Typography>
              {worldData.factions.length === 0 && worldData.characters.length === 0 && (
                <Button
                  variant="outlined"
                  onClick={() => navigate('/factions')}
                  sx={{
                    borderColor: '#8B6914',
                    color: '#8B6914',
                  }}
                >
                  前往势力管理
                </Button>
              )}
            </CardContent>
          </Card>
        </Fade>
      )}

      {/* 编年史卡片列表 */}
      {sortedChronicles.length > 0 && (
        <Grid container spacing={3}>
          {sortedChronicles.map((entry, index) => (
            <Grid item xs={12} md={6} lg={4} key={entry.id}>
              <Zoom in timeout={300 + index * 100}>
                <Card
                  onClick={() => handleOpenReader(entry)}
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    background: 'linear-gradient(145deg, #faf3e0 0%, #f5e6c8 100%)',
                    border: '2px solid rgba(139,105,20,0.3)',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#D4A84B',
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(139,105,20,0.2)',
                    },
                  }}
                >
                  <CardContent>
                    {/* 标题和菜单 */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontFamily: "'LXGW WenKai TC', serif",
                          fontWeight: 700,
                          color: '#3E2723',
                          fontSize: '1.1rem',
                          lineHeight: 1.4,
                          flex: 1,
                        }}
                      >
                        {entry.title}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, entry)}
                        sx={{ color: '#8B6914', ml: 1 }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* 时间范围 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <CalendarMonthIcon sx={{ fontSize: 16, color: '#8B6914' }} />
                      <Typography variant="body2" sx={{ color: '#8B6914', fontWeight: 600 }}>
                        第 {entry.startYear} - {entry.endYear} 年
                      </Typography>
                    </Box>

                    {/* 预览 */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#5D4037',
                        lineHeight: 1.7,
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {getPreview(entry.content)}
                    </Typography>

                    {/* 日期标签 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Chip
                        label={formatDate(entry.createdAt)}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: 'rgba(139,105,20,0.3)',
                          color: '#8B6914',
                          fontSize: '0.7rem',
                        }}
                      />
                      <OpenInNewIcon sx={{ fontSize: 18, color: 'rgba(139,105,20,0.5)' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 右下角悬浮按钮（移动端） */}
      <Fab
        color="primary"
        aria-label="书写新篇"
        onClick={() => setFormOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(135deg, #8B6914 0%, #D4A84B 100%)',
          display: { xs: 'flex', md: 'none' },
          '&:hover': {
            background: 'linear-gradient(135deg, #6B4F10 0%, #B8860B 100%)',
          },
        }}
      >
        <AutoAwesomeIcon />
      </Fab>

      {/* 操作菜单 */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            background: '#faf3e0',
            border: '1px solid rgba(139,105,20,0.3)',
          },
        }}
      >
        <MenuItem
          onClick={() => {
            const entry = menuEntry;
            handleMenuClose();
            if (entry) handleOpenReader(entry);
          }}
        >
          <ListItemIcon>
            <AutoStoriesIcon fontSize="small" sx={{ color: '#8B6914' }} />
          </ListItemIcon>
          <ListItemText>阅读</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            const entry = menuEntry;
            handleMenuClose();
            if (entry) handleOpenEdit(entry);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" sx={{ color: '#8B6914' }} />
          </ListItemIcon>
          <ListItemText>编辑</ListItemText>
        </MenuItem>
        <Divider sx={{ borderColor: 'rgba(139,105,20,0.2)' }} />
        <MenuItem
          onClick={() => {
            const entry = menuEntry;
            handleMenuClose();
            if (entry) handleDelete(entry.id);
          }}
          sx={{ color: '#C62828' }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" sx={{ color: '#C62828' }} />
          </ListItemIcon>
          <ListItemText>删除</ListItemText>
        </MenuItem>
      </Menu>

      {/* 史书阅读器 */}
      <ChronicleReader
        open={readerOpen}
        entry={selectedEntry}
        onClose={() => setReaderOpen(false)}
        onDelete={handleDelete}
        onEdit={handleOpenEdit}
      />

      {/* 生成表单 */}
      <ChronicleForm
        open={formOpen}
        worldData={worldData}
        isGenerating={isGenerating}
        error={generationError}
        onGenerate={handleGenerate}
        onClose={() => {
          setFormOpen(false);
          setGenerationError(null);
        }}
      />

      {/* AI 设置弹窗（生成时校验失败触发） */}
      <AiSettingsDialog
        open={settingsOpen}
        config={config}
        onSave={saveConfig}
        onClose={() => setSettingsOpen(false)}
      />

      {/* 统一设置弹窗（AI 配置按钮触发，定位到 AI Tab） */}
      <SettingsDialog
        open={globalSettingsOpen}
        onClose={() => setGlobalSettingsOpen(false)}
        initialTab={1}
      />

      {/* 编辑编年史对话框 */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(180deg, #fffef8 0%, #fdf6e3 100%)',
            border: '2px solid rgba(139,105,20,0.3)',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: "'LXGW WenKai TC', serif",
            color: '#3E2723',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6" sx={{ fontFamily: "'LXGW WenKai TC', serif", fontWeight: 700 }}>
            编辑史书
          </Typography>
          <IconButton onClick={() => setEditOpen(false)} size="small" sx={{ color: '#8B6914' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="标题"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            required
          />
          <TextField
            label="内容"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            fullWidth
            multiline
            rows={10}
            placeholder="请输入史书内容..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: '#8B6914' }}>
            取消
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={!editTitle.trim()}
            sx={{
              background: 'linear-gradient(135deg, #8B6914 0%, #D4A84B 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #6B4F10 0%, #B8860B 100%)',
              },
            }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChroniclePage;
