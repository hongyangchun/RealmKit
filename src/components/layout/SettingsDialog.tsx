/**
 * SettingsDialog - 统一设置弹窗
 * 包含五个 Tab：世界信息、AI 配置、数据管理、地图设置、关于
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  Paper,
  Divider,
  Collapse,
  Alert,
  LinearProgress,
  Chip,
  Slider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import PublicIcon from '@mui/icons-material/Public';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StorageIcon from '@mui/icons-material/Storage';
import MapIcon from '@mui/icons-material/Map';
import InfoIcon from '@mui/icons-material/Info';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import KeyIcon from '@mui/icons-material/Key';
import ApiIcon from '@mui/icons-material/Api';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';

import { useWorldStore } from '../../store/worldStore';
import { useAiConfig } from '../../hooks/useAiConfig';
import { useAudioStore } from '../../store/audioStore';
import { importExportService } from '../../services/importExport';
import { syncService } from '../../services/syncService';
import { markBackupTime, shouldRemindBackup, formatLastBackupTime, getDaysSinceLastBackup } from '../../services/backupTracker';
import { audioManager } from '../../services/audio/AudioManager';
import { proceduralSFX } from '../../services/audio/ProceduralSFX';
import { useSFX } from '../../hooks/useSFX';
import ConfirmDialog from '../common/ConfirmDialog';
import type { AiConfig } from '../../types';

// ─── AI 预设模型 ──────────────────────────────────────────────────────
const PRESET_MODELS = [
  { name: 'GPT-4o', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
  { name: 'GPT-4o Mini', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  { name: 'Claude 3.5 Sonnet', endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20241022' },
  { name: 'DeepSeek V3', endpoint: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  { name: 'Qwen 2.5', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
  { name: '自定义', endpoint: '', model: '' },
];

// ─── Props ─────────────────────────────────────────────────────────────
interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /** 初始打开时跳转到哪个 Tab（0-4） */
  initialTab?: number;
}

// ─── Component ─────────────────────────────────────────────────────────
const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
  initialTab = 0,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { config: aiConfig, saveConfig: saveAiConfig, clearConfig: clearAiConfig } = useAiConfig();
  const worldMeta = useWorldStore((s) => s.data.meta);
  const setWorldMeta = useWorldStore((s) => s.setWorldMeta);
  const resetWorld = useWorldStore((s) => s.resetWorld);
  const importWorld = useWorldStore((s) => s.importWorld);
  const exportWorld = useWorldStore((s) => s.exportWorld);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sfx = useSFX();

  // 世界信息表单
  const [worldName, setWorldName] = useState(worldMeta.name);
  const [worldDesc, setWorldDesc] = useState(worldMeta.description);

  // AI 配置表单
  const [aiForm, setAiForm] = useState<AiConfig>(aiConfig);
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [showAiAdvanced, setShowAiAdvanced] = useState(false);

  // 数据管理
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [clearAiConfirmOpen, setClearAiConfirmOpen] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 5 * 1024 * 1024 });
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  // 同步 initialTab
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setWorldName(worldMeta.name);
      setWorldDesc(worldMeta.description);
      setAiForm(aiConfig);
      setAiErrors({});
      refreshStorageInfo();
    }
  }, [open, initialTab, worldMeta, aiConfig]);

  const refreshStorageInfo = useCallback(() => {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          used += (localStorage.getItem(key) || '').length * 2; // UTF-16
        }
      }
      setStorageInfo({ used, total: 5 * 1024 * 1024 });
    } catch {
      // ignore
    }
  }, []);

  // ── 世界信息保存 ──
  const handleSaveWorldInfo = () => {
    if (!worldName.trim()) return;
    setWorldMeta({ name: worldName.trim(), description: worldDesc.trim() });
    sfx.play('ui/success');
  };

  // ── AI 配置保存 ──
  const validateAi = (): boolean => {
    const errs: Record<string, string> = {};
    if (!aiForm.apiEndpoint.trim()) errs.apiEndpoint = '请输入 API 地址';
    else if (!aiForm.apiEndpoint.startsWith('http')) errs.apiEndpoint = '必须以 http 或 https 开头';
    if (!aiForm.apiKey.trim()) errs.apiKey = '请输入 API 密钥';
    if (!aiForm.modelName.trim()) errs.modelName = '请输入模型名称';
    if (aiForm.maxTokens !== undefined && (aiForm.maxTokens < 100 || aiForm.maxTokens > 8000)) {
      errs.maxTokens = 'Token 数量应在 100-8000 之间';
    }
    setAiErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveAi = () => {
    if (validateAi()) {
      saveAiConfig(aiForm);
      sfx.play('ui/success');
    }
  };

  // ── 数据管理 ──
  const handleExportWorld = () => {
    const data = exportWorld();
    importExportService.exportToJson(data);
    markBackupTime();
    setExportMenuAnchor(null);
    sfx.play('sfx/export');
  };

  const handleExportFullBackup = () => {
    const data = exportWorld();
    importExportService.exportFullBackup(data);
    markBackupTime();
    setExportMenuAnchor(null);
    sfx.play('sfx/export');
  };

  const handleImportClick = () => {
    sfx.play('sfx/import');
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 弹出确认对话框
    setPendingImportFile(file);
    setImportConfirmOpen(true);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!pendingImportFile) return;
    try {
      const result = await importExportService.importFromFile(pendingImportFile);
      importWorld(result.world);
      // 恢复附加数据
      importExportService.restoreExtras(result);
      sfx.play('ui/success');
    } catch (err) {
      alert((err as Error).message);
    }
    setImportConfirmOpen(false);
    setPendingImportFile(null);
    // 刷新页面以加载恢复的 AI 配置和编年史
    window.location.reload();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // ── Tab 面板 ──
  const tabLabels = [
    { label: '世界信息', icon: <PublicIcon sx={{ fontSize: 18 }} /> },
    { label: 'AI 配置', icon: <SmartToyIcon sx={{ fontSize: 18 }} /> },
    { label: '数据管理', icon: <StorageIcon sx={{ fontSize: 18 }} /> },
    { label: '地图设置', icon: <MapIcon sx={{ fontSize: 18 }} /> },
    { label: '音频设置', icon: <VolumeUpIcon sx={{ fontSize: 18 }} /> },
    { label: '关于', icon: <InfoIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(145deg, #faf3e0 0%, #f5e6c8 100%)',
          borderRadius: 3,
          border: '2px solid #1a237e',
          boxShadow: '0 8px 32px rgba(26,35,126,0.25)',
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: "'LXGW WenKai TC', serif",
          color: '#1a237e',
          borderBottom: '1px solid rgba(26,35,126,0.2)',
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon sx={{ color: '#1a237e' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "'LXGW WenKai TC', serif" }}>
            设置
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#5D4037' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: '1px solid rgba(26,35,126,0.15)',
          '& .MuiTab-root': {
            minHeight: 44,
            fontSize: '0.82rem',
            color: '#5D4037',
            gap: 0.5,
            '&.Mui-selected': { color: '#1a237e', fontWeight: 600 },
          },
          '& .MuiTabs-indicator': { backgroundColor: '#1a237e' },
        }}
      >
        {tabLabels.map((t) => (
          <Tab key={t.label} label={t.label} icon={t.icon} iconPosition="start" />
        ))}
      </Tabs>

      {/* Content */}
      <DialogContent sx={{ py: 3, flex: 1, overflow: 'auto' }}>
        {/* ── Tab 0: 世界信息 ── */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#1a237e', fontWeight: 600, mb: 2 }}>
              编辑当前世界的基本信息
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="世界名称"
              value={worldName}
              onChange={(e) => setWorldName(e.target.value)}
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.6)' },
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="世界描述"
              multiline
              rows={3}
              value={worldDesc}
              onChange={(e) => setWorldDesc(e.target.value)}
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.6)' },
              }}
            />
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ color: '#888', mb: 1 }}>
              只读信息
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Paper elevation={0} sx={{ p: 1.5, background: 'rgba(26,35,126,0.05)', borderRadius: 2, flex: '1 1 200px' }}>
                <Typography variant="caption" sx={{ color: '#888' }}>世界 ID</Typography>
                <Typography variant="body2" sx={{ color: '#1a237e', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {worldMeta.id}
                </Typography>
              </Paper>
              <Paper elevation={0} sx={{ p: 1.5, background: 'rgba(26,35,126,0.05)', borderRadius: 2, flex: '1 1 200px' }}>
                <Typography variant="caption" sx={{ color: '#888' }}>创建时间</Typography>
                <Typography variant="body2" sx={{ color: '#1a237e', fontSize: '0.85rem' }}>
                  {new Date(worldMeta.createdAt).toLocaleString('zh-CN')}
                </Typography>
              </Paper>
              <Paper elevation={0} sx={{ p: 1.5, background: 'rgba(26,35,126,0.05)', borderRadius: 2, flex: '1 1 200px' }}>
                <Typography variant="caption" sx={{ color: '#888' }}>最后更新</Typography>
                <Typography variant="body2" sx={{ color: '#1a237e', fontSize: '0.85rem' }}>
                  {new Date(worldMeta.updatedAt).toLocaleString('zh-CN')}
                </Typography>
              </Paper>
            </Box>
          </Box>
        )}

        {/* ── Tab 1: AI 配置 ── */}
        {activeTab === 1 && (
          <Box>
            {/* 快速预设 */}
            <Paper
              elevation={0}
              sx={{ p: 2, mb: 3, background: 'rgba(26,35,126,0.05)', borderRadius: 2, border: '1px solid rgba(26,35,126,0.15)' }}
            >
              <Typography variant="subtitle2" sx={{ color: '#1a237e', fontWeight: 600, mb: 1.5 }}>
                快速预设
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {PRESET_MODELS.map((preset) => {
                  const isActive =
                    aiForm.modelName === preset.model ||
                    (preset.name === '自定义' && !PRESET_MODELS.slice(0, -1).find((p) => p.model === aiForm.modelName));
                  return (
                    <Button
                      key={preset.name}
                      size="small"
                      variant={isActive ? 'contained' : 'outlined'}
                      onClick={() => {
                        if (preset.name === '自定义') {
                          setAiForm((prev) => ({ ...prev, apiEndpoint: '', modelName: '' }));
                        } else {
                          setAiForm((prev) => ({ ...prev, apiEndpoint: preset.endpoint, modelName: preset.model }));
                        }
                      }}
                      sx={{
                        fontSize: '0.75rem',
                        py: 0.5,
                        ...(isActive
                          ? { background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)', color: '#fff' }
                          : {
                              borderColor: 'rgba(26,35,126,0.5)',
                              color: '#1a237e',
                              '&:hover': { borderColor: '#1a237e', background: 'rgba(26,35,126,0.1)' },
                            }),
                      }}
                    >
                      {preset.name}
                    </Button>
                  );
                })}
              </Box>
            </Paper>

            {/* API 地址 */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ApiIcon sx={{ fontSize: 18, color: '#1a237e' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a237e' }}>API 地址</Typography>
              </Box>
              <TextField
                fullWidth size="small"
                placeholder="https://api.openai.com/v1/chat/completions"
                value={aiForm.apiEndpoint}
                onChange={(e) => setAiForm((prev) => ({ ...prev, apiEndpoint: e.target.value }))}
                error={!!aiErrors.apiEndpoint}
                helperText={aiErrors.apiEndpoint || '输入 API 服务地址'}
                sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.6)' } }}
              />
            </Box>

            {/* API 密钥 */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <KeyIcon sx={{ fontSize: 18, color: '#1a237e' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a237e' }}>API 密钥</Typography>
              </Box>
              <TextField
                fullWidth size="small"
                type="password"
                placeholder="sk-..."
                value={aiForm.apiKey}
                onChange={(e) => setAiForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                error={!!aiErrors.apiKey}
                helperText={aiErrors.apiKey || '您的 API 密钥，仅保存在本地浏览器'}
                sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.6)' } }}
              />
            </Box>

            {/* 模型名称 */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AutoModeIcon sx={{ fontSize: 18, color: '#1a237e' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a237e' }}>模型名称</Typography>
              </Box>
              <TextField
                fullWidth size="small"
                placeholder="gpt-4o"
                value={aiForm.modelName}
                onChange={(e) => setAiForm((prev) => ({ ...prev, modelName: e.target.value }))}
                error={!!aiErrors.modelName}
                helperText={aiErrors.modelName || '如 gpt-4o、claude-3-5-sonnet-20241022'}
                sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.6)' } }}
              />
            </Box>

            {/* 高级设置 */}
            <Divider sx={{ my: 2 }} />
            <Button
              onClick={() => setShowAiAdvanced(!showAiAdvanced)}
              endIcon={showAiAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ color: '#5D4037', '&:hover': { background: 'rgba(93,64,55,0.1)' } }}
            >
              高级设置
            </Button>
            <Collapse in={showAiAdvanced}>
              <Box sx={{ mt: 2, mb: 1 }}>
                <TextField
                  fullWidth size="small"
                  label="最大 Token 数"
                  type="number"
                  value={aiForm.maxTokens || 2000}
                  onChange={(e) => setAiForm((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 2000 }))}
                  error={!!aiErrors.maxTokens}
                  helperText={aiErrors.maxTokens || '控制生成内容长度，建议 1500-3000'}
                  inputProps={{ min: 100, max: 8000 }}
                  sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.6)' } }}
                />
              </Box>
            </Collapse>

            <Alert severity="warning" sx={{ mt: 2, background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.3)', '& .MuiAlert-icon': { color: '#E65100' } }}>
              <Typography variant="body2">配置仅保存在本地浏览器中，不会同步到任何服务器。</Typography>
            </Alert>
          </Box>
        )}

        {/* ── Tab 2: 数据管理 ── */}
        {activeTab === 2 && (
          <Box>
            {/* 存储用量 */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, background: 'rgba(26,35,126,0.05)', borderRadius: 2, border: '1px solid rgba(26,35,126,0.15)' }}>
              <Typography variant="subtitle2" sx={{ color: '#1a237e', fontWeight: 600, mb: 1 }}>
                存储空间用量
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((storageInfo.used / storageInfo.total) * 100, 100)}
                  sx={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    background: 'rgba(26,35,126,0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: storageInfo.used > storageInfo.total * 0.8 ? '#E65100' : '#1a237e',
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: '#5D4037', whiteSpace: 'nowrap' }}>
                  {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.total)}
                </Typography>
              </Box>
            </Paper>

            {/* 备份提醒 */}
            {shouldRemindBackup() && (
              <Alert severity="warning" sx={{ mb: 2, background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.3)', '& .MuiAlert-icon': { color: '#E65100' } }}>
                <Typography variant="body2">
                  您的世界数据已超过 {getDaysSinceLastBackup()} 天未备份。换电脑或清除浏览器数据会导致丢失，建议立即导出备份。
                </Typography>
              </Alert>
            )}

            {/* 云同步状态 */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, background: 'rgba(26,35,126,0.05)', borderRadius: 2, border: '1px solid rgba(26,35,126,0.15)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#1a237e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  {syncService.isAuthenticated()
                    ? <><CloudDoneIcon sx={{ fontSize: 18 }} /> 云同步</>
                    : <><CloudOffIcon sx={{ fontSize: 18 }} /> 云同步</>
                  }
                </Typography>
                {syncService.isAuthenticated() && (
                  <Chip
                    label="已连接"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 22 }}
                  />
                )}
              </Box>
              {syncService.isAuthenticated() ? (
                <>
                  <Typography variant="body2" sx={{ color: '#5D4037', mb: 1 }}>
                    数据变更后自动同步到云端，换设备登录即可恢复。
                  </Typography>
                  {/* 当前登录账号 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, background: 'rgba(26,35,126,0.04)', borderRadius: 1 }}>
                    <AccountCircleIcon sx={{ fontSize: 16, color: '#1a237e' }} />
                    <Typography variant="caption" sx={{ color: '#1a237e', fontWeight: 500, flex: 1 }}>
                      {syncService.getCurrentUserEmail() ?? '已登录'}
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<LogoutIcon sx={{ fontSize: 14 }} />}
                      onClick={() => syncService.logout()}
                      sx={{
                        fontSize: '0.7rem',
                        color: '#888',
                        minWidth: 0,
                        px: 1,
                        '&:hover': { color: '#E65100', background: 'rgba(230,81,0,0.06)' },
                      }}
                    >
                      切换账号
                    </Button>
                  </Box>
                  {syncService.getLastSyncAt() && (
                    <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
                      上次同步：{new Date(syncService.getLastSyncAt()!).toLocaleString('zh-CN')}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CloudSyncIcon sx={{ fontSize: 16 }} />}
                      onClick={async () => {
                        const data = useWorldStore.getState().data;
                        await syncService.forceSyncWorld(data);
                        refreshStorageInfo();
                      }}
                      sx={{
                        fontSize: '0.75rem',
                        borderColor: 'rgba(26,35,126,0.4)',
                        color: '#1a237e',
                        '&:hover': { borderColor: '#1a237e', background: 'rgba(26,35,126,0.08)' },
                      }}
                    >
                      立即同步
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>
                    未连接云端。通过 Cloudflare Access 登录后可启用自动同步。
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
                    数据仍安全保存在本地浏览器中。
                  </Typography>
                </>
              )}
            </Paper>

            {/* 导入导出 */}
            <Typography variant="subtitle2" sx={{ color: '#1a237e', fontWeight: 600, mb: 1.5 }}>
              导入 / 导出
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<FileUploadIcon />}
                onClick={handleImportClick}
                fullWidth
                sx={{
                  borderColor: 'rgba(26,35,126,0.5)',
                  color: '#1a237e',
                  '&:hover': { borderColor: '#1a237e', background: 'rgba(26,35,126,0.05)' },
                }}
              >
                导入数据
              </Button>
              <Box sx={{ position: 'relative', flex: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  endIcon={<ArrowDropDownIcon />}
                  onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                  fullWidth
                  sx={{
                    borderColor: 'rgba(26,35,126,0.5)',
                    color: '#1a237e',
                    '&:hover': { borderColor: '#1a237e', background: 'rgba(26,35,126,0.05)' },
                  }}
                >
                  导出数据
                </Button>
                <Menu
                  anchorEl={exportMenuAnchor}
                  open={Boolean(exportMenuAnchor)}
                  onClose={() => setExportMenuAnchor(null)}
                  PaperProps={{
                    sx: { borderRadius: 2, border: '1px solid rgba(26,35,126,0.15)', minWidth: 200 },
                  }}
                >
                  <MenuItem onClick={handleExportFullBackup}>
                    <ListItemIcon><CloudDownloadIcon sx={{ color: '#1a237e', fontSize: 20 }} /></ListItemIcon>
                    <ListItemText
                      primary="完整备份（推荐）"
                      primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
                      secondary="世界数据 + AI 配置 + 编年史"
                      secondaryTypographyProps={{ fontSize: '0.72rem' }}
                    />
                  </MenuItem>
                  <MenuItem onClick={handleExportWorld}>
                    <ListItemIcon><SaveAltIcon sx={{ color: '#5D4037', fontSize: 20 }} /></ListItemIcon>
                    <ListItemText
                      primary="仅世界数据"
                      primaryTypographyProps={{ fontSize: '0.85rem' }}
                      secondary="势力/人物/地图/事件"
                      secondaryTypographyProps={{ fontSize: '0.72rem' }}
                    />
                  </MenuItem>
                </Menu>
              </Box>
            </Box>

            {/* 备份时间信息 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#888' }}>
                上次备份：{formatLastBackupTime()}
              </Typography>
              <Typography variant="caption" sx={{ color: '#aaa' }}>
                · 支持拖拽 JSON 文件到页面直接导入
              </Typography>
            </Box>
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />

            <Divider sx={{ my: 2.5 }} />

            {/* 危险操作 */}
            <Typography variant="subtitle2" sx={{ color: '#C62828', fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningAmberIcon sx={{ fontSize: 18 }} />
              危险操作
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<KeyIcon />}
                onClick={() => setClearAiConfirmOpen(true)}
                sx={{
                  borderColor: 'rgba(198,40,40,0.4)',
                  color: '#C62828',
                  justifyContent: 'flex-start',
                  '&:hover': { borderColor: '#C62828', background: 'rgba(198,40,40,0.05)' },
                }}
              >
                清除 AI 配置（API 密钥等）
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setResetConfirmOpen(true)}
                sx={{
                  borderColor: 'rgba(198,40,40,0.4)',
                  color: '#C62828',
                  justifyContent: 'flex-start',
                  '&:hover': { borderColor: '#C62828', background: 'rgba(198,40,40,0.05)' },
                }}
              >
                重置世界（清空所有数据）
              </Button>
            </Box>
          </Box>
        )}

        {/* ── Tab 3: 地图设置 ── */}
        {activeTab === 3 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3, background: 'rgba(26,35,126,0.05)', border: '1px solid rgba(26,35,126,0.2)', '& .MuiAlert-icon': { color: '#1a237e' } }}>
              <Typography variant="body2">
                地图设置项当前使用硬编码默认值，此处展示供参考。后续版本可开放为可编辑配置。
              </Typography>
            </Alert>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: '默认网格宽度', value: '100', desc: '新建地图时的默认宽度（格数）' },
                { label: '默认网格高度', value: '100', desc: '新建地图时的默认高度（格数）' },
                { label: '默认单元格大小', value: '10 px', desc: '每个网格格子的像素尺寸' },
                { label: '默认画笔颜色', value: '#1a237e', desc: '地图绘制工具的默认颜色' },
                { label: '撤销历史上限', value: '50 步', desc: '地图绘制的最大撤销步数' },
                { label: '默认势力色板', value: '6 色', desc: '#8B0000, #00008B, #006400, #8B4513, #4B0082, #B8860B' },
              ].map((item) => (
                <Paper key={item.label} elevation={0} sx={{ p: 1.5, background: 'rgba(26,35,126,0.05)', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#1a237e' }}>{item.label}</Typography>
                    <Typography variant="caption" sx={{ color: '#888' }}>{item.desc}</Typography>
                  </Box>
                  <Chip label={item.value} size="small" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} />
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {/* ── Tab 4: 音频设置 ── */}
        {activeTab === 4 && <AudioSettingsPanel />}

        {/* ── Tab 5: 关于 ── */}
        {activeTab === 5 && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" sx={{ fontFamily: "'LXGW WenKai TC', serif", color: '#1a237e', fontWeight: 700, mb: 0.5 }}>
              世界圣典
            </Typography>
            <Typography variant="body2" sx={{ color: '#5D4037', mb: 3 }}>
              ZZWorld Chronicle
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 360, mx: 'auto', textAlign: 'left' }}>
              {[
                { label: '版本', value: '1.0.0' },
                { label: '技术栈', value: 'React + TypeScript + MUI + Zustand' },
                { label: '可视化', value: 'react-force-graph-2d + GridCanvas' },
                { label: '搜索', value: 'Fuse.js 模糊搜索' },
                { label: '数据存储', value: 'localStorage（本地优先）' },
                { label: 'AI 集成', value: 'OpenAI 兼容 API' },
              ].map((item) => (
                <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#888' }}>{item.label}</Typography>
                  <Typography variant="body2" sx={{ color: '#1a237e', fontWeight: 500 }}>{item.value}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Footer actions */}
      <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid rgba(26,35,126,0.1)', gap: 1 }}>
        <Button onClick={onClose} sx={{ color: '#5D4037' }}>
          关闭
        </Button>
        {(activeTab === 0 || activeTab === 1) && (
          <Button
            variant="contained"
            onClick={activeTab === 0 ? handleSaveWorldInfo : handleSaveAi}
            sx={{
              background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)',
              color: '#fff',
              px: 3,
              '&:hover': { background: 'linear-gradient(135deg, #0d1757 0%, #1a237e 100%)' },
            }}
          >
            保存
          </Button>
        )}
      </DialogActions>

      {/* 导入确认对话框 */}
      <ConfirmDialog
        open={importConfirmOpen}
        title="确认导入数据？"
        message="导入将覆盖当前所有世界数据。建议先导出备份后再导入。"
        confirmLabel="确认导入"
        cancelLabel="取消"
        severity="warning"
        onConfirm={handleConfirmImport}
        onCancel={() => {
          setImportConfirmOpen(false);
          setPendingImportFile(null);
        }}
      />

      {/* 确认对话框 */}
      <ConfirmDialog
        open={resetConfirmOpen}
        title={`确认重置「${worldMeta.name}」？`}
        message="此操作将清空当前世界的所有势力、人物、事件、关系和地图数据，不可撤销。建议先导出备份。"
        confirmLabel="确认重置"
        cancelLabel="取消"
        severity="error"
        onConfirm={() => {
          resetWorld();
          setResetConfirmOpen(false);
          onClose();
        }}
        onCancel={() => setResetConfirmOpen(false)}
      />
      <ConfirmDialog
        open={clearAiConfirmOpen}
        title="确认清除 AI 配置？"
        message="将清除 API 地址、密钥和模型选择。不会影响世界数据。"
        confirmLabel="确认清除"
        cancelLabel="取消"
        severity="warning"
        onConfirm={() => {
          clearAiConfig();
          setAiForm({ apiEndpoint: '', apiKey: '', modelName: '', maxTokens: 2000 });
          setClearAiConfirmOpen(false);
        }}
        onCancel={() => setClearAiConfirmOpen(false)}
      />
    </Dialog>
  );
};

export default SettingsDialog;

// ─── 音频设置面板（独立子组件）───────────────────────────────────────────

const AudioSettingsPanel: React.FC = () => {
  const masterVolume = useAudioStore((s) => s.masterVolume);
  const sfxVolume = useAudioStore((s) => s.sfxVolume);
  const musicVolume = useAudioStore((s) => s.musicVolume);
  const ambienceVolume = useAudioStore((s) => s.ambienceVolume);
  const isMuted = useAudioStore((s) => s.isMuted);
  const musicEnabled = useAudioStore((s) => s.musicEnabled);
  const ambienceEnabled = useAudioStore((s) => s.ambienceEnabled);
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume);
  const setSfxVolume = useAudioStore((s) => s.setSfxVolume);
  const setMusicVolume = useAudioStore((s) => s.setMusicVolume);
  const setAmbienceVolume = useAudioStore((s) => s.setAmbienceVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const toggleMusic = useAudioStore((s) => s.toggleMusic);
  const toggleAmbience = useAudioStore((s) => s.toggleAmbience);

  const sliderSx = {
    '& .MuiSlider-thumb': {
      color: '#1a237e',
      width: 18,
      height: 18,
    },
    '& .MuiSlider-track': {
      color: '#1a237e',
    },
    '& .MuiSlider-rail': {
      color: 'rgba(26,35,126,0.2)',
    },
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: '#1a237e', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <GraphicEqIcon sx={{ fontSize: 18 }} />
        调整世界的声音氛围
      </Typography>

      {/* 全局静音 */}
      <Paper
        elevation={0}
        sx={{
          p: 2, mb: 3, borderRadius: 2,
          background: isMuted ? 'rgba(198,40,40,0.08)' : 'rgba(26,35,126,0.05)',
          border: `1px solid ${isMuted ? 'rgba(198,40,40,0.2)' : 'rgba(26,35,126,0.15)'}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: isMuted ? '#C62828' : '#1a237e' }}>
              {isMuted ? '🔇 已静音' : '🔊 全局音频'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#888' }}>
              {isMuted ? '所有声音已关闭' : '控制所有音频的总开关'}
            </Typography>
          </Box>
          <Switch
            checked={!isMuted}
            onChange={toggleMute}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: '#1a237e' },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1a237e' },
            }}
          />
        </Box>
      </Paper>

      {/* 主音量 */}
      <VolumeSlider
        label="主音量"
        icon={<VolumeUpIcon sx={{ fontSize: 18, color: '#1a237e' }} />}
        value={masterVolume}
        onChange={setMasterVolume}
        disabled={isMuted}
        sliderSx={sliderSx}
      />

      <Divider sx={{ my: 2 }} />

      {/* 音效音量 */}
      <VolumeSlider
        label="音效音量"
        description="按钮、弹窗、交互音效"
        icon={<VolumeUpIcon sx={{ fontSize: 16, color: '#5D4037' }} />}
        value={sfxVolume}
        onChange={setSfxVolume}
        disabled={isMuted}
        sliderSx={sliderSx}
      />

      {/* 音乐音量 */}
      <Box sx={{ mt: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MusicNoteIcon sx={{ fontSize: 16, color: '#5D4037' }} />
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#1a237e' }}>背景音乐</Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={musicEnabled}
                onChange={toggleMusic}
                size="small"
                disabled={isMuted}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#1a237e' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1a237e' },
                }}
              />
            }
            label={<Typography variant="caption" sx={{ color: '#888' }}>{musicEnabled ? '开启' : '关闭'}</Typography>}
            labelPlacement="start"
            sx={{ mr: 0 }}
          />
        </Box>
        <Slider
          value={musicVolume}
          onChange={(_, v) => setMusicVolume(v as number)}
          min={0} max={1} step={0.05}
          disabled={isMuted || !musicEnabled}
          sx={sliderSx}
        />
      </Box>

      {/* 环境声音量 */}
      <Box sx={{ mt: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GraphicEqIcon sx={{ fontSize: 16, color: '#5D4037' }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#1a237e' }}>环境声</Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>风声、鸟鸣、壁炉等氛围声</Typography>
            </Box>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={ambienceEnabled}
                onChange={toggleAmbience}
                size="small"
                disabled={isMuted}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#1a237e' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1a237e' },
                }}
              />
            }
            label={<Typography variant="caption" sx={{ color: '#888' }}>{ambienceEnabled ? '开启' : '关闭'}</Typography>}
            labelPlacement="start"
            sx={{ mr: 0 }}
          />
        </Box>
        <Slider
          value={ambienceVolume}
          onChange={(_, v) => setAmbienceVolume(v as number)}
          min={0} max={1} step={0.05}
          disabled={isMuted || !ambienceEnabled}
          sx={sliderSx}
        />
      </Box>

      <Divider sx={{ my: 2.5 }} />

      {/* 音效试听 */}
      <SFXPreviewPanel />

      <Divider sx={{ my: 2.5 }} />

      <Alert
        severity="info"
        sx={{
          background: 'rgba(26,35,126,0.05)',
          border: '1px solid rgba(26,35,126,0.15)',
          '& .MuiAlert-icon': { color: '#1a237e' },
        }}
      >
        <Typography variant="body2">
          音频设置会自动保存在浏览器中。首次使用时，声音会在您第一次点击页面后激活。
        </Typography>
      </Alert>
    </Box>
  );
};

// ─── 音量滑块子组件 ──────────────────────────────────────────────────────

interface VolumeSliderProps {
  label: string;
  description?: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  sliderSx: object;
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({
  label, description, icon, value, onChange, disabled, sliderSx,
}) => (
  <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      {icon}
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500, color: '#1a237e' }}>{label}</Typography>
        {description && <Typography variant="caption" sx={{ color: '#888' }}>{description}</Typography>}
      </Box>
    </Box>
    <Slider
      value={value}
      onChange={(_, v) => onChange(v as number)}
      min={0} max={1} step={0.05}
      disabled={disabled}
      sx={sliderSx}
    />
  </Box>
);

// ─── SFX 音效试听面板 ────────────────────────────────────────────────────

/** SFX 事件的中文名称映射 */
const SFX_LABELS: Record<string, string> = {
  'ui/click': '点击',
  'ui/hover': '悬停',
  'ui/drawer_open': '抽屉展开',
  'ui/drawer_close': '抽屉收起',
  'ui/dialog_open': '弹窗打开',
  'ui/dialog_close': '弹窗关闭',
  'ui/tab_switch': '切换标签',
  'ui/success': '成功',
  'ui/delete': '删除',
  'ui/error': '错误',
  'ui/search_type': '搜索输入',
  'ui/search_result': '搜索结果',
  'sfx/card_flip': '卡片翻转',
  'sfx/card_place': '卡片放置',
  'sfx/pin_drop': '图钉放下',
  'sfx/pin_hover': '图钉悬停',
  'sfx/paint_start': '画笔蘸墨',
  'sfx/paint_stroke': '画笔描画',
  'sfx/timeline_scroll': '时间轴滚动',
  'sfx/event_create': '创建事件',
  'sfx/event_conflict': '事件冲突',
  'sfx/graph_node_select': '节点选中',
  'sfx/graph_link': '关系连线',
  'sfx/chronicle_scroll': '编年史翻页',
  'sfx/faction_color': '势力配色',
  'sfx/import': '导入',
  'sfx/export': '导出',
};

const SFXPreviewPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [diagInfo, setDiagInfo] = useState({ voices: 0, buffers: 0, ready: false, musicState: 'silence' });
  const isMuted = useAudioStore((s) => s.isMuted);

  // 刷新诊断信息
  const refreshDiag = useCallback(() => {
    setDiagInfo({
      voices: audioManager.voiceCount,
      buffers: audioManager.loadedSFXCount,
      ready: proceduralSFX.isReady,
      musicState: audioManager.musicState,
    });
  }, []);

  useEffect(() => {
    if (expanded) {
      refreshDiag();
      const timer = setInterval(refreshDiag, 1000);
      return () => clearInterval(timer);
    }
  }, [expanded, refreshDiag]);

  const handlePreview = useCallback((eventId: string) => {
    if (isMuted) return;
    // 确保 AudioContext 已激活
    if (!audioManager.isActive) {
      audioManager.activate();
    }
    audioManager.playSFX(eventId);
    setPlayingId(eventId);
    setTimeout(() => setPlayingId((prev) => (prev === eventId ? null : prev)), 400);
  }, [isMuted]);

  const uiEvents = Object.keys(SFX_LABELS).filter((id) => id.startsWith('ui/'));
  const sfxEvents = Object.keys(SFX_LABELS).filter((id) => id.startsWith('sfx/'));

  const renderGroup = (title: string, events: string[]) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ color: '#888', fontWeight: 600, mb: 1, display: 'block' }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
        {events.map((eventId) => {
          const isPlaying = playingId === eventId;
          return (
            <Chip
              key={eventId}
              icon={<PlayArrowIcon sx={{ fontSize: '14px !important' }} />}
              label={SFX_LABELS[eventId]}
              size="small"
              onClick={() => handlePreview(eventId)}
              sx={{
                fontFamily: "'LXGW WenKai TC', serif",
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                ...(isPlaying
                  ? {
                      backgroundColor: '#1a237e',
                      color: '#fff',
                      '& .MuiChip-icon': { color: '#fff' },
                    }
                  : {
                      backgroundColor: 'rgba(26,35,126,0.08)',
                      color: '#1a237e',
                      border: '1px solid rgba(26,35,126,0.2)',
                      '&:hover': {
                        backgroundColor: 'rgba(26,35,126,0.18)',
                        borderColor: '#1a237e',
                      },
                      '& .MuiChip-icon': { color: '#1a237e' },
                    }),
              }}
            />
          );
        })}
      </Box>
    </Box>
  );

  return (
    <Box>
      <Button
        onClick={() => setExpanded(!expanded)}
        endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        startIcon={<GraphicEqIcon sx={{ fontSize: 16 }} />}
        sx={{
          color: '#1a237e',
          fontWeight: 600,
          '&:hover': { background: 'rgba(26,35,126,0.08)' },
        }}
      >
        音效试听
      </Button>

      <Collapse in={expanded}>
        <Paper
          elevation={0}
          sx={{
            p: 2, mt: 1, borderRadius: 2,
            background: 'rgba(26,35,126,0.03)',
            border: '1px solid rgba(26,35,126,0.12)',
          }}
        >
          {/* 诊断信息 */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {[
              { label: '合成状态', value: diagInfo.ready ? '✅ 就绪' : '⏳ 未初始化' },
              { label: '已加载音效', value: `${diagInfo.buffers} 个` },
              { label: '活跃声道', value: `${diagInfo.voices} / 8` },
              { label: '音乐状态', value: diagInfo.musicState },
            ].map((item) => (
              <Box key={item.label} sx={{ display: 'flex', gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#888' }}>{item.label}:</Typography>
                <Typography variant="caption" sx={{ color: '#1a237e', fontWeight: 500 }}>{item.value}</Typography>
              </Box>
            ))}
          </Box>

          {isMuted && (
            <Alert severity="warning" sx={{ mb: 2, py: 0.5, '& .MuiAlert-message': { py: 0 } }}>
              <Typography variant="caption">音频已静音，请先取消静音再试听。</Typography>
            </Alert>
          )}

          {renderGroup('✦ 界面音效 (UI)', uiEvents)}
          {renderGroup('✦ 交互音效 (Interaction)', sfxEvents)}

          <Typography variant="caption" sx={{ color: '#aaa', display: 'block', mt: 1 }}>
            所有音效和背景音乐由 Web Audio API 实时合成，零外部文件。音乐随页面自动切换。
          </Typography>
        </Paper>
      </Collapse>
    </Box>
  );
};
