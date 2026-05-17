/**
 * WorldSeedWizard - 世界种子生成器向导
 * 3步引导用户创建全新的架空世界（地图优先流程）
 * Step0: 地图配置 + 实时预览
 * Step1: 内容配置 + 跳过选项
 * Step2: 最终预览确认
 */
import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  FormControlLabel,
  Checkbox,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PublicIcon from '@mui/icons-material/Public';
import type { WorldStyle, TerrainType, WorldSeedResult, TerrainCell, TerritoryCell } from '../../types';
import { worldSeedGenerator } from '../../services/worldSeedGenerator';
import { mapGenerator } from '../../services/mapGenerator';
import MapPreviewCanvas from './MapPreviewCanvas';
import WorldSeedPreview from './WorldSeedPreview';

interface WorldSeedWizardProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (result: WorldSeedResult) => void;
}

// 世界风格配置
const WORLD_STYLES: Array<{
  key: WorldStyle;
  emoji: string;
  name: string;
  description: string;
  color: string;
}> = [
  {
    key: 'fantasy',
    emoji: '🐉',
    name: '奇幻大陆',
    description: '龙与魔法、骑士与精灵的世界',
    color: '#6B5B95',
  },
  {
    key: 'oriental',
    emoji: '⚔️',
    name: '东方古国',
    description: '王朝更迭、武侠风云的热血战场',
    color: '#C0392B',
  },
  {
    key: 'war',
    emoji: '🎖️',
    name: '铁血战争',
    description: '钢铁与火药、军团与战役的史诗',
    color: '#5D6D7E',
  },
  {
    key: 'scifi',
    emoji: '🚀',
    name: '星际文明',
    description: '星际战舰、量子科技与宇宙探索',
    color: '#1A5276',
  },
];

// 地形类型配置
const TERRAIN_TYPES: Array<{
  key: TerrainType;
  emoji: string;
  name: string;
  desc: string;
}> = [
  { key: 'continent', emoji: '🌍', name: '大陆', desc: '广袤的大陆与海洋' },
  { key: 'archipelago', emoji: '🏝️', name: '群岛', desc: '星罗棋布的岛屿' },
  { key: 'desert', emoji: '🏜️', name: '沙漠', desc: '黄沙漫天的荒原' },
  { key: 'tundra', emoji: '❄️', name: '冰原', desc: '冰雪覆盖的大地' },
];

const WorldSeedWizard: React.FC<WorldSeedWizardProps> = ({
  open,
  onClose,
  onGenerate,
}) => {
  const [step, setStep] = useState(0);
  const [factionCount, setFactionCount] = useState(4);
  const [style, setStyle] = useState<WorldStyle>('fantasy');
  const [terrain, setTerrain] = useState<TerrainType>('continent');
  const [mapSeedInput, setMapSeedInput] = useState('');
  const [skipFactions, setSkipFactions] = useState(false);
  const [skipCharacters, setSkipCharacters] = useState(false);
  const [skipEvents, setSkipEvents] = useState(false);
  const [seedResult, setSeedResult] = useState<WorldSeedResult | null>(null);

  // Step0 的地图预览数据
  const [mapPreview, setMapPreview] = useState<{
    terrainCells: TerrainCell[];
    territoryCells: TerritoryCell[];
  } | null>(null);

  // 解析种子
  const getMapSeed = useCallback((): number | undefined => {
    if (!mapSeedInput.trim()) return undefined;
    const n = parseInt(mapSeedInput.trim(), 10);
    return isNaN(n) ? undefined : n;
  }, [mapSeedInput]);

  // 生成地图预览（Step0 用，只生成地形+领地预览）
  const handleGenerateMapPreview = useCallback(() => {
    const result = mapGenerator.generateMap(
      {
        width: 100,
        height: 100,
        terrainType: terrain,
        seed: getMapSeed(),
      },
      skipFactions ? 0 : factionCount,
    );
    setMapPreview({
      terrainCells: result.terrainCells,
      territoryCells: result.territoryCells,
    });
  }, [terrain, factionCount, skipFactions, getMapSeed]);

  // 生成完整世界种子（Step1→Step2 用）
  const handleGenerateSeed = useCallback(() => {
    const result = worldSeedGenerator.generate({
      factionCount,
      style,
      terrain,
      skipFactions,
      skipCharacters,
      skipEvents,
      mapSeed: getMapSeed(),
    });
    setSeedResult(result);
    // 也更新预览
    setMapPreview({
      terrainCells: result.mapTerrainCells,
      territoryCells: result.mapTerritoryCells,
    });
    setStep(2);
  }, [factionCount, style, terrain, skipFactions, skipCharacters, skipEvents, getMapSeed]);

  // 重新随机
  const handleRegenerate = useCallback(() => {
    if (step === 0) {
      handleGenerateMapPreview();
    } else {
      handleGenerateSeed();
    }
  }, [step, handleGenerateMapPreview, handleGenerateSeed]);

  // 确认生成
  const handleConfirm = useCallback(() => {
    if (seedResult) {
      onGenerate(seedResult);
      handleClose();
    }
  }, [seedResult, onGenerate]);

  // 下一步
  const handleNext = useCallback(() => {
    if (step === 0) {
      // 如果还没有生成过预览，先生成
      if (!mapPreview) {
        handleGenerateMapPreview();
      }
      setStep(1);
    } else if (step === 1) {
      handleGenerateSeed();
    }
  }, [step, mapPreview, handleGenerateMapPreview, handleGenerateSeed]);

  // 上一步
  const handleBack = useCallback(() => {
    if (step === 1) setStep(0);
    else if (step === 2) setStep(1);
  }, [step]);

  // 重置向导状态
  const handleClose = useCallback(() => {
    setStep(0);
    setFactionCount(4);
    setStyle('fantasy');
    setTerrain('continent');
    setMapSeedInput('');
    setSkipFactions(false);
    setSkipCharacters(false);
    setSkipEvents(false);
    setSeedResult(null);
    setMapPreview(null);
    onClose();
  }, [onClose]);

  // 处理跳过势力的联动
  const handleSkipFactionsChange = useCallback((checked: boolean) => {
    setSkipFactions(checked);
    if (checked) {
      setSkipCharacters(true);
      setSkipEvents(true);
    }
  }, []);

  // 步骤指示器
  const StepIndicator = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: i === step ? '#1a237e' : 'rgba(26,35,126,0.2)',
            transition: 'background-color 0.3s',
          }}
        />
      ))}
    </Box>
  );

  // ========== Step 0: 地图配置 + 预览 ==========
  const MapConfigStep = () => (
    <Box>
      <Typography
        variant="h5"
        sx={{
          fontFamily: "'LXGW WenKai TC', serif",
          fontWeight: 700,
          color: '#1a237e',
          textAlign: 'center',
          mb: 1,
        }}
      >
        第一步：创建你的世界地图
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: '#666', textAlign: 'center', mb: 2 }}
      >
        选择地形类型，预览你的世界！
      </Typography>

      {/* 地形选择 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1.5,
          mb: 2,
        }}
      >
        {TERRAIN_TYPES.map((t) => (
          <Button
            key={t.key}
            onClick={() => setTerrain(t.key)}
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '2px solid',
              borderColor: terrain === t.key ? '#1a237e' : 'rgba(26,35,126,0.15)',
              backgroundColor: terrain === t.key ? '#1a237e' : '#fff',
              color: terrain === t.key ? '#fff' : '#1a237e',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.3,
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: '#1a237e',
                backgroundColor: terrain === t.key ? '#1a237e' : '#f0f0ff',
              },
            }}
          >
            <Typography sx={{ fontSize: '1.8rem' }}>{t.emoji}</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.name}</Typography>
            <Typography sx={{ fontSize: '0.65rem', opacity: 0.8 }}>{t.desc}</Typography>
          </Button>
        ))}
      </Box>

      {/* 种子输入 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="body2" sx={{ color: '#666', fontSize: '0.8rem' }}>
          种子（可选）:
        </Typography>
        <TextField
          size="small"
          value={mapSeedInput}
          onChange={(e) => setMapSeedInput(e.target.value)}
          placeholder="留空随机"
          sx={{
            width: 120,
            '& .MuiOutlinedInput-root': {
              fontSize: '0.85rem',
              height: 32,
            },
          }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleGenerateMapPreview}
          sx={{
            borderColor: 'rgba(26,35,126,0.3)',
            color: '#1a237e',
            fontSize: '0.8rem',
          }}
        >
          生成地图
        </Button>
      </Box>

      {/* 地图预览 */}
      {mapPreview && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <MapPreviewCanvas
            terrainCells={mapPreview.terrainCells}
            territoryCells={mapPreview.territoryCells}
            canvasSize={280}
          />
          <Typography
            variant="caption"
            sx={{ color: '#888', mt: 0.5, fontSize: '0.7rem' }}
          >
            <PublicIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
            地图预览（可在地图编辑器中继续编辑）
          </Typography>
        </Box>
      )}
    </Box>
  );

  // ========== Step 1: 内容配置 + 跳过选项 ==========
  const ContentConfigStep = () => (
    <Box>
      <Typography
        variant="h5"
        sx={{
          fontFamily: "'LXGW WenKai TC', serif",
          fontWeight: 700,
          color: '#1a237e',
          textAlign: 'center',
          mb: 1,
        }}
      >
        第二步：世界的内容
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: '#666', textAlign: 'center', mb: 2 }}
      >
        选择风格和势力，或者跳过直接生成地图！
      </Typography>

      {/* 世界风格选择 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1.5,
          mb: 2,
        }}
      >
        {WORLD_STYLES.map((s) => (
          <Button
            key={s.key}
            onClick={() => setStyle(s.key)}
            disabled={skipFactions}
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '2px solid',
              borderColor: style === s.key ? s.color : 'rgba(26,35,126,0.15)',
              backgroundColor: style === s.key ? `${s.color}15` : '#fff',
              boxShadow:
                style === s.key
                  ? `0 0 12px ${s.color}40`
                  : '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s',
              opacity: skipFactions ? 0.5 : 1,
              '&:hover': {
                borderColor: s.color,
              },
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '2rem', mb: 0.3 }}>{s.emoji}</Typography>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: style === s.key ? s.color : '#1a237e', mb: 0.2 }}
              >
                {s.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666', fontSize: '0.65rem' }}>
                {s.description}
              </Typography>
            </Box>
          </Button>
        ))}
      </Box>

      {/* 势力数量 */}
      {!skipFactions && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#666', mb: 1, textAlign: 'center' }}>
            势力数量：
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            {[3, 4, 5, 6].map((count) => (
              <Button
                key={count}
                onClick={() => setFactionCount(count)}
                sx={{
                  minWidth: 60,
                  py: 0.8,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: factionCount === count ? '#1a237e' : 'rgba(26,35,126,0.2)',
                  backgroundColor: factionCount === count ? '#1a237e' : '#fff',
                  color: factionCount === count ? '#fff' : '#1a237e',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                }}
              >
                {count} 国
              </Button>
            ))}
          </Box>
        </Box>
      )}

      {/* 跳过选项 */}
      <Box
        sx={{
          background: 'rgba(26,35,126,0.04)',
          borderRadius: 2,
          p: 1.5,
          border: '1px dashed rgba(26,35,126,0.2)',
        }}
      >
        <Typography variant="subtitle2" sx={{ color: '#1a237e', mb: 1, fontWeight: 700 }}>
          可跳过内容
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={skipFactions}
              onChange={(e) => handleSkipFactionsChange(e.target.checked)}
              size="small"
              sx={{ color: '#1a237e' }}
            />
          }
          label="跳过势力生成（仅生成地图）"
          sx={{ display: 'block', mb: -0.5, '& .MuiTypography-root': { fontSize: '0.85rem' } }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={skipCharacters}
              onChange={(e) => setSkipCharacters(e.target.checked)}
              disabled={skipFactions}
              size="small"
              sx={{ color: '#1a237e' }}
            />
          }
          label="跳过人物生成"
          sx={{
            display: 'block',
            mb: -0.5,
            opacity: skipFactions ? 0.5 : 1,
            '& .MuiTypography-root': { fontSize: '0.85rem' },
          }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={skipEvents}
              onChange={(e) => setSkipEvents(e.target.checked)}
              disabled={skipFactions}
              size="small"
              sx={{ color: '#1a237e' }}
            />
          }
          label="跳过历史事件生成"
          sx={{
            display: 'block',
            opacity: skipFactions ? 0.5 : 1,
            '& .MuiTypography-root': { fontSize: '0.85rem' },
          }}
        />
      </Box>
    </Box>
  );

  // ========== Step 2: 最终预览 ==========
  const PreviewStep = () => (
    <Box>
      <Typography
        variant="h5"
        sx={{
          fontFamily: "'LXGW WenKai TC', serif",
          fontWeight: 700,
          color: '#1a237e',
          textAlign: 'center',
          mb: 1,
        }}
      >
        预览你的世界
      </Typography>
      <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', mb: 2 }}>
        可以点击「重新随机」换一批！
      </Typography>

      {/* 地图预览 */}
      {mapPreview && (
        <Box sx={{ mb: 2 }}>
          <MapPreviewCanvas
            terrainCells={mapPreview.terrainCells}
            territoryCells={mapPreview.territoryCells}
            canvasSize={260}
          />
        </Box>
      )}

      {/* 内容预览 */}
      {seedResult && (
        <WorldSeedPreview
          result={seedResult}
          skipFactions={skipFactions}
          skipCharacters={skipCharacters}
          skipEvents={skipEvents}
        />
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#faf3e0',
          borderRadius: 3,
          maxHeight: '90vh',
        },
      }}
    >
      {/* 标题栏 */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(26,35,126,0.1)',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: '#ffd54f' }} />
          <Typography
            variant="h6"
            sx={{ fontFamily: "'LXGW WenKai TC', serif", fontWeight: 700, color: '#1a237e' }}
          >
            创建新世界
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* 内容区 */}
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <StepIndicator />
        {step === 0 && <MapConfigStep />}
        {step === 1 && <ContentConfigStep />}
        {step === 2 && <PreviewStep />}
      </DialogContent>

      {/* 操作栏 */}
      <DialogActions
        sx={{
          px: 3,
          pb: 2,
          borderTop: '1px solid rgba(26,35,126,0.1)',
          pt: 2,
          justifyContent: 'space-between',
        }}
      >
        <Box>
          {step > 0 && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              sx={{ color: '#666' }}
            >
              上一步
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {(step === 0 || step === 2) && (
            <Button
              startIcon={<RefreshIcon />}
              onClick={handleRegenerate}
              variant="outlined"
              sx={{
                borderColor: 'rgba(26,35,126,0.3)',
                color: '#1a237e',
              }}
            >
              重新随机
            </Button>
          )}

          {step < 2 ? (
            <Button
              endIcon={<ArrowForwardIcon />}
              onClick={handleNext}
              variant="contained"
              sx={{
                backgroundColor: '#1a237e',
                '&:hover': { backgroundColor: '#0d1557' },
              }}
            >
              {step === 0 ? '下一步' : '生成预览'}
            </Button>
          ) : (
            <Button
              endIcon={<AutoAwesomeIcon />}
              onClick={handleConfirm}
              variant="contained"
              sx={{
                backgroundColor: '#ffd54f',
                color: '#1a237e',
                fontWeight: 700,
                '&:hover': { backgroundColor: '#ffca28' },
              }}
            >
              生成世界！
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default WorldSeedWizard;
