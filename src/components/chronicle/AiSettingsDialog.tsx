/**
 * AiSettingsDialog - AI 配置弹窗
 * 设置 API Endpoint、API Key、模型名称
 */
import React, { useState, useEffect } from 'react';
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
  Collapse,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import KeyIcon from '@mui/icons-material/Key';
import ApiIcon from '@mui/icons-material/Api';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import type { AiConfig } from '../../types';

interface AiSettingsDialogProps {
  open: boolean;
  config: AiConfig | null;
  onSave: (config: AiConfig) => void;
  onClose: () => void;
}

const PRESET_MODELS = [
  { name: 'GPT-4o', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
  { name: 'GPT-4o Mini', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  { name: 'Claude 3.5 Sonnet', endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-sonnet-20241022' },
  { name: 'DeepSeek V3', endpoint: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  { name: 'Qwen 2.5', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
  { name: '自定义', endpoint: '', model: '' },
];

const AiSettingsDialog: React.FC<AiSettingsDialogProps> = ({
  open,
  config,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<AiConfig>({
    apiEndpoint: '',
    apiKey: '',
    modelName: '',
    maxTokens: 2000,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 初始化表单数据
  useEffect(() => {
    if (config) {
      setFormData(config);
    } else {
      setFormData({
        apiEndpoint: '',
        apiKey: '',
        modelName: '',
        maxTokens: 2000,
      });
    }
    setErrors({});
  }, [config, open]);

  const handlePresetChange = (preset: typeof PRESET_MODELS[number]) => {
    if (preset.name === '自定义') {
      setFormData((prev) => ({
        ...prev,
        apiEndpoint: '',
        modelName: '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        apiEndpoint: preset.endpoint,
        modelName: preset.model,
      }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.apiEndpoint.trim()) {
      newErrors.apiEndpoint = '请输入 API 地址';
    } else if (!formData.apiEndpoint.startsWith('http')) {
      newErrors.apiEndpoint = 'API 地址必须以 http 或 https 开头';
    }

    if (!formData.apiKey.trim()) {
      newErrors.apiKey = '请输入 API 密钥';
    }

    if (!formData.modelName.trim()) {
      newErrors.modelName = '请输入模型名称';
    }

    if (formData.maxTokens !== undefined) {
      if (formData.maxTokens < 100 || formData.maxTokens > 8000) {
        newErrors.maxTokens = 'Token 数量应在 100-8000 之间';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(145deg, #faf3e0 0%, #f5e6c8 100%)',
          borderRadius: 3,
          border: '2px solid #1a237e',
          boxShadow: '0 8px 32px rgba(26,35,126,0.25)',
        },
      }}
    >
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SettingsIcon sx={{ color: '#1a237e' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            AI 配置
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#5D4037' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {/* 快速预设 */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            background: 'rgba(26,35,126,0.05)',
            borderRadius: 2,
            border: '1px solid rgba(26,35,126,0.15)',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ color: '#1a237e', fontWeight: 600, mb: 1.5 }}
          >
            快速预设
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {PRESET_MODELS.map((preset) => (
              <Button
                key={preset.name}
                size="small"
                variant={
                  formData.modelName === preset.model ||
                  (preset.name === '自定义' && !PRESET_MODELS.slice(0, -1).find(p => p.model === formData.modelName))
                    ? 'contained'
                    : 'outlined'
                }
                onClick={() => handlePresetChange(preset)}
                sx={{
                  fontSize: '0.75rem',
                  py: 0.5,
                  ...(formData.modelName === preset.model ||
                  (preset.name === '自定义' && !PRESET_MODELS.slice(0, -1).find(p => p.model === formData.modelName))
                    ? {
                        background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)',
                        color: '#fff',
                      }
                    : {
                        borderColor: 'rgba(26,35,126,0.5)',
                        color: '#1a237e',
                        '&:hover': {
                          borderColor: '#1a237e',
                          background: 'rgba(26,35,126,0.1)',
                        },
                      }),
                }}
              >
                {preset.name}
              </Button>
            ))}
          </Box>
        </Paper>

        {/* API 地址 */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ApiIcon sx={{ fontSize: 18, color: '#1a237e' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a237e' }}>
              API 地址
            </Typography>
          </Box>
          <TextField
            fullWidth
            size="small"
            placeholder="https://api.openai.com/v1/chat/completions"
            value={formData.apiEndpoint}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, apiEndpoint: e.target.value }))
            }
            error={!!errors.apiEndpoint}
            helperText={errors.apiEndpoint || '输入 API 服务地址'}
            disabled={!!formData.modelName && PRESET_MODELS.some(p => p.name !== '自定义' && p.model === formData.modelName)}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: 'rgba(255,255,255,0.6)',
              },
            }}
          />
        </Box>

        {/* API 密钥 */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <KeyIcon sx={{ fontSize: 18, color: '#1a237e' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a237e' }}>
              API 密钥
            </Typography>
          </Box>
          <TextField
            fullWidth
            size="small"
            type="password"
            placeholder="sk-..."
            value={formData.apiKey}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, apiKey: e.target.value }))
            }
            error={!!errors.apiKey}
            helperText={errors.apiKey || '您的 API 密钥，不会保存到服务器'}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: 'rgba(255,255,255,0.6)',
              },
            }}
          />
        </Box>

        {/* 模型名称 */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AutoModeIcon sx={{ fontSize: 18, color: '#1a237e' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a237e' }}>
              模型名称
            </Typography>
          </Box>
          <TextField
            fullWidth
            size="small"
            placeholder="gpt-4o"
            value={formData.modelName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, modelName: e.target.value }))
            }
            error={!!errors.modelName}
            helperText={errors.modelName || '如 gpt-4o、claude-3-5-sonnet-20241022'}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: 'rgba(255,255,255,0.6)',
              },
            }}
          />
        </Box>

        {/* 高级设置 */}
        <Divider sx={{ my: 2 }} />
        <Button
          onClick={() => setShowAdvanced(!showAdvanced)}
          endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{
            color: '#5D4037',
            '&:hover': { background: 'rgba(93,64,55,0.1)' },
          }}
        >
          高级设置
        </Button>

        <Collapse in={showAdvanced}>
          <Box sx={{ mt: 2, mb: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="最大 Token 数"
              type="number"
              value={formData.maxTokens || 2000}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxTokens: parseInt(e.target.value) || 2000,
                }))
              }
              error={!!errors.maxTokens}
              helperText={errors.maxTokens || '控制生成内容的长度，建议 1500-3000'}
              inputProps={{ min: 100, max: 8000 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255,255,255,0.6)',
                },
              }}
            />
          </Box>
        </Collapse>

        {/* 安全提示 */}
        <Alert
          severity="warning"
          sx={{
            mt: 2,
            background: 'rgba(255,152,0,0.1)',
            border: '1px solid rgba(255,152,0,0.3)',
            '& .MuiAlert-icon': { color: '#E65100' },
          }}
        >
          <Typography variant="body2">
            配置仅保存在本地浏览器中，不会同步到任何服务器。请确保 API 密钥安全。
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: '#5D4037' }}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)',
            color: '#fff',
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #0d1757 0%, #1a237e 100%)',
            },
          }}
        >
          保存配置
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AiSettingsDialog;
