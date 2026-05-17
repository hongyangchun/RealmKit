/**
 * PlotSuggestionPanel - 角色剧情灵感面板
 * 显示基于特质/AI生成的剧情建议，可一键创建事件
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Skeleton,
  Divider,
  Chip,
  Tooltip,
  Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { Character } from '../../types';
import { plotSuggestionService, type PlotSuggestion } from '../../services/plotSuggestionService';
import { useAiConfig } from '../../hooks/useAiConfig';

interface PlotSuggestionPanelProps {
  character: Character;
  onCreateEvent?: (
    prefilled: { title: string; description: string; tags: string[]; characterId: string }
  ) => void;
}

const PlotSuggestionPanel: React.FC<PlotSuggestionPanelProps> = ({
  character,
  onCreateEvent,
}) => {
  const { config: aiConfig, isConfigured } = useAiConfig();

  const [suggestions, setSuggestions] = useState<PlotSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载建议
  const loadSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let results: PlotSuggestion[];

      if (isConfigured && aiConfig) {
        // AI模式
        results = await plotSuggestionService.suggestForCharacter(
          aiConfig,
          character
        );
      } else {
        // 模板模式
        results = plotSuggestionService.getTemplateSuggestions(character);
      }

      setSuggestions(results);
    } catch (err) {
      console.error('[PlotSuggestionPanel] 加载建议失败:', err);
      setError('生成建议时出错');
      // 降级到模板
      setSuggestions(plotSuggestionService.getTemplateSuggestions(character));
    } finally {
      setIsLoading(false);
    }
  }, [character, aiConfig, isConfigured]);

  // 组件挂载时加载
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // 处理创建事件
  const handleCreateEvent = (suggestion: PlotSuggestion) => {
    if (!suggestion.prefilledEvent || !onCreateEvent) return;

    onCreateEvent({
      ...suggestion.prefilledEvent,
      characterId: character.id,
    });
  };

  // 刷新建议
  const handleRefresh = () => {
    loadSuggestions();
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* 标题栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LightbulbIcon sx={{ color: '#f39c12', fontSize: 20 }} />
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: '#1a237e' }}
          >
            剧情灵感
          </Typography>
          {isConfigured && (
            <Chip
              label="AI"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
              }}
            />
          )}
        </Box>

        <Tooltip title="换一组灵感">
          <IconButton
            size="small"
            onClick={handleRefresh}
            sx={{ color: '#1a237e' }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* AI未配置提示 */}
      {!isConfigured && !isLoading && suggestions.length > 0 && (
        <Alert
          severity="info"
          sx={{
            mb: 1.5,
            py: 0.5,
            fontSize: '0.75rem',
            backgroundColor: '#fffef8',
            color: '#8B4513',
            '& .MuiAlert-icon': { color: '#8B4513' },
          }}
        >
          💡 配置 AI 可获得更个性化的剧情建议
        </Alert>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <Box sx={{ py: 1 }}>
          {[1, 2].map((i) => (
            <Box key={i} sx={{ mb: 1.5 }}>
              <Skeleton
                variant="rounded"
                height={60}
                sx={{ bgcolor: 'rgba(26,35,126,0.06)' }}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* 错误状态 */}
      {error && !isLoading && (
        <Typography
          variant="body2"
          sx={{ color: '#C0392B', py: 1, textAlign: 'center' }}
        >
          {error}
        </Typography>
      )}

      {/* 建议列表 */}
      {!isLoading && suggestions.length > 0 && (
        <Box>
          {suggestions.map((suggestion, index) => (
            <Box key={suggestion.id}>
              {/* 建议卡片 */}
              <Box
                sx={{
                  p: 1.5,
                  mb: 1,
                  borderRadius: 1,
                  border: '1px solid rgba(26,35,126,0.1)',
                  backgroundColor: '#fffef8',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'rgba(26,35,126,0.25)',
                    boxShadow: '0 2px 8px rgba(26,35,126,0.08)',
                  },
                }}
              >
                {/* 标题和类型标签 */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontFamily: "'LXGW WenKai TC', serif",
                      fontWeight: 700,
                      color: '#1a237e',
                      fontSize: '0.95rem',
                    }}
                  >
                    {suggestion.title}
                  </Typography>
                  {suggestion.suggestedEventType && (
                    <Chip
                      label={suggestion.suggestedEventType}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        backgroundColor: 'rgba(26,35,126,0.08)',
                        color: '#1a237e',
                      }}
                    />
                  )}
                </Box>

                {/* 描述 */}
                <Typography
                  variant="body2"
                  sx={{
                    color: '#555',
                    fontSize: '0.8rem',
                    lineHeight: 1.6,
                    mb: 1,
                  }}
                >
                  {suggestion.description}
                </Typography>

                {/* 创建事件按钮 */}
                {suggestion.prefilledEvent && onCreateEvent && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                    onClick={() => handleCreateEvent(suggestion)}
                    sx={{
                      borderColor: '#1a237e',
                      color: '#1a237e',
                      fontSize: '0.75rem',
                      py: 0.25,
                      px: 1,
                      '&:hover': {
                        borderColor: '#1a237e',
                        backgroundColor: 'rgba(26,35,126,0.05)',
                      },
                    }}
                  >
                    创建这个事件
                  </Button>
                )}
              </Box>

              {/* 分隔线（除了最后一个） */}
              {index < suggestions.length - 1 && (
                <Divider sx={{ opacity: 0.3 }} />
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* 无建议状态 */}
      {!isLoading && suggestions.length === 0 && !error && (
        <Typography
          variant="body2"
          sx={{
            color: '#999',
            textAlign: 'center',
            py: 2,
            fontSize: '0.85rem',
          }}
        >
          暂无灵感——为这个角色添加更多特质来获得灵感！
        </Typography>
      )}
    </Box>
  );
};

export default PlotSuggestionPanel;
