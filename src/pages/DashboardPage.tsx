/**
 * DashboardPage - 总览仪表盘
 *
 * 世界概览页面，作为进入各功能模块的枢纽：
 * - 空世界时：全屏引导卡片 + 世界种子向导
 * - 有数据时：紧凑 Hero 横幅 + 迷你地图 + 最近动态 + 势力概览
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  keyframes,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RecentEditList from '../components/dashboard/RecentEditList';
import ReadOnlyMapPreview from '../components/dashboard/ReadOnlyMapPreview';
import FactionOverviewCard from '../components/dashboard/FactionOverviewCard';
import WorldSeedWizard from '../components/dashboard/WorldSeedWizard';
import CanvasErrorBoundary from '../components/common/CanvasErrorBoundary';
import StoryEmptyState from '../components/common/StoryEmptyState';
import { useWorldStore } from '../store/worldStore';
import { reducedMotionOverride } from '../theme/transitions';
import type { WorldSeedResult } from '../types';

// ─── Hero 呼吸动画 ──────────────────────────────────────────

/** 背景渐变呼吸 — 深蓝 ↔ 稍浅蓝缓慢交替 */
const heroBreathe = keyframes`
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
`;

/** 世界名称发光脉冲 */
const nameGlow = keyframes`
  0%, 100% {
    text-shadow: 0 0 4px rgba(255,213,79,0.2);
  }
  50% {
    text-shadow: 0 0 10px rgba(255,213,79,0.35), 0 0 3px rgba(255,213,79,0.1);
  }
`;

// ─── 可点击 Section 标题 ──────────────────────────────────────────────────────

interface SectionTitleProps {
  emoji: string;
  label: string;
  onClick?: () => void;
  action?: React.ReactNode;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ emoji, label, onClick, action }) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: onClick ? 'pointer' : 'default',
      '&:hover .section-arrow': onClick
        ? { opacity: 1, transform: 'translateX(0)' }
        : undefined,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        variant="subtitle2"
        fontWeight={600}
        sx={{ color: 'text.primary', fontSize: '0.85rem' }}
      >
        {emoji} {label}
      </Typography>
      {onClick && (
        <ArrowForwardIcon
          className="section-arrow"
          sx={{
            fontSize: '0.85rem',
            color: 'text.secondary',
            opacity: 0,
            transform: 'translateX(-4px)',
            transition: 'all 0.2s',
          }}
        />
      )}
    </Box>
    {action}
  </Box>
);

// ─── 主组件 ──────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const data = useWorldStore((s) => s.data);
  const applyWorldSeed = useWorldStore((s) => s.applyWorldSeed);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { meta, factions, characters, events, cities, mapPins } = data;

  // 判断世界是否为空（无势力、无人物、无事件、无地图数据）
  const isWorldEmpty =
    factions.length === 0 &&
    characters.length === 0 &&
    events.length === 0 &&
    Object.keys(data.mapGrid?.cells ?? {}).length === 0;

  const handleGenerate = (result: WorldSeedResult) => {
    applyWorldSeed(result);
    setWizardOpen(false);
  };

  // 内嵌统计项
  const heroStats = [
    { label: '势力', value: factions.length, path: '/factions' },
    { label: '人物', value: characters.length, path: '/characters' },
    { label: '城市', value: cities.length, path: '/factions' },
    { label: '事件', value: events.length, path: '/timeline' },
  ];

  // ═══ 空世界引导 ═══
  if (isWorldEmpty) {
    return (
      <>
        <StoryEmptyState
          scene="dashboard"
          fullScreen
          onAction={() => setWizardOpen(true)}
          actionLabel="点亮第一颗星"
        >
          {/* 新建世界按钮浮在右上角 */}
          <Button
            size="small"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => setWizardOpen(true)}
            sx={{
              position: 'fixed',
              top: 76,
              right: 12,
              zIndex: 10,
              backgroundColor: '#ffd54f',
              color: '#1a237e',
              fontWeight: 700,
              '&:hover': { backgroundColor: '#ffca28' },
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              fontSize: '0.8rem',
            }}
          >
            新建世界
          </Button>
        </StoryEmptyState>

        {/* 世界种子向导弹窗 */}
        <WorldSeedWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onGenerate={handleGenerate} />
      </>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: 'calc(100vh - 64px)',
        overflow: 'auto',
        background: '#f5f0e8',
      }}
    >
      {/*
        外层不设 px，让 Grid 布局用 gap 自行对齐。
        每个 section 用统一的 px: 3 控制内边距，确保左边缘对齐。
      */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 3 }}>
        {/* ═══ Hero 横幅 ═══ */}
        <Card
          sx={{
            background: 'linear-gradient(135deg, #1a237e 0%, #283593 40%, #1a237e 70%, #283593 100%)',
            backgroundSize: '200% 200%',
            animation: `${heroBreathe} 8s ease-in-out infinite`,
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            mb: 2.5,
            ...reducedMotionOverride,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 3,
              py: 2,
            }}
          >
            {/* 左侧：世界名 + 简介 */}
            <Box
              onClick={() => navigate('/map')}
              sx={{
                flex: 1,
                minWidth: 0,
                cursor: 'pointer',
                '&:hover .world-name': { textDecoration: 'underline' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Typography
                  className="world-name"
                  sx={{
                    fontFamily: "'LXGW WenKai TC', serif",
                    fontWeight: 700,
                    fontSize: '1.3rem',
                    color: '#ffd54f',
                    whiteSpace: 'nowrap',
                    transition: 'text-decoration 0.2s',
                    animation: `${nameGlow} 4s ease-in-out infinite`,
                    ...reducedMotionOverride,
                  }}
                >
                  🌍 {meta.name}
                </Typography>
              </Box>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 400,
                }}
              >
                {meta.description || '一个宏大的架空历史世界'}
              </Typography>
            </Box>

            {/* 右侧：内嵌统计数字 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: '1px',
                  height: 36,
                  background: 'rgba(255,255,255,0.12)',
                  mr: 2,
                }}
              />
              {heroStats.map((stat) => (
                <Box
                  key={stat.label}
                  onClick={() => navigate(stat.path)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    px: 2,
                    cursor: 'pointer',
                    borderRadius: 2,
                    py: 0.5,
                    transition: 'background 0.2s',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.7)',
                      lineHeight: 1,
                      mb: 0.3,
                    }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      color: '#ffd54f',
                      lineHeight: 1.2,
                    }}
                  >
                    {stat.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>

        {/* ═══ 中间双栏：迷你地图 + 最近动态 ═══ */}
        {/*
          使用 CSS Grid 代替 MUI Grid 以避免 spacing 产生的负 margin 导致对齐偏移。
          gap 控制两栏间距，不影响左边缘对齐。
        */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '7.5fr 2.5fr' },
            gap: 2.5,
            mb: 2.5,
          }}
        >
          {/* 左栏：迷你地图预览 */}
          <Card
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'rgba(0,0,0,0.08)',
              background: '#f8f6f0',
            }}
          >
            <Box sx={{ px: 3, pt: 2, pb: 1 }}>
              <SectionTitle
                emoji="🗺"
                label="世界地图"
                onClick={() => navigate('/map')}
              />
            </Box>
            <Box
              sx={{
                px: 3,
                pb: 2.5,
                // 让地图容器保持正方形：宽高比 1:1
                '& .map-frame': { aspectRatio: '1 / 1' },
              }}
            >
              {/* 地图装饰外框 */}
              <Box
                className="map-frame"
                sx={{
                  width: '100%',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '2px solid',
                  borderColor: 'rgba(26,35,126,0.15)',
                  boxShadow: `
                    0 2px 8px rgba(0,0,0,0.08),
                    inset 0 0 0 1px rgba(255,255,255,0.5)
                  `,
                }}
              >
                <CanvasErrorBoundary label="世界地图预览">
                  <ReadOnlyMapPreview />
                </CanvasErrorBoundary>
              </Box>
            </Box>
          </Card>

          {/* 右栏：最近动态 */}
          <Card
            sx={{
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid',
              borderColor: 'rgba(0,0,0,0.08)',
            }}
          >
            <Box sx={{ px: 3, pt: 2, pb: 1 }}>
              <SectionTitle
                emoji="📋"
                label="最近动态"
                onClick={() => navigate('/timeline')}
              />
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', px: 2.5 }}>
              <RecentEditList />
            </Box>
          </Card>
        </Box>

        {/* ═══ 底部：势力概览 ═══ */}
        {factions.length > 0 && (
          <Card
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'rgba(0,0,0,0.08)',
              mb: 3,
            }}
          >
            <Box sx={{ px: 3, pt: 2, pb: 1 }}>
              <SectionTitle
                emoji="🏛"
                label="势力概览"
                onClick={() => navigate('/factions')}
              />
            </Box>
            <Box
              sx={{
                px: 3,
                pb: 3,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 2,
              }}
            >
              {factions.map((faction) => (
                <FactionOverviewCard key={faction.id} faction={faction} />
              ))}
            </Box>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default DashboardPage;
