/**
 * StoryEmptyState - 叙事化空状态组件
 *
 * 将空状态从"功能占位"升级为"故事邀请"。
 * 每个模块拥有专属的叙事文案、图标和氛围。
 *
 * 使用方式：
 * ```tsx
 * <StoryEmptyState scene="map" onAction={() => navigate('/map')} />
 * ```
 */
import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, keyframes, Fade } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExploreIcon from '@mui/icons-material/Explore';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PublicIcon from '@mui/icons-material/Public';

// ─── 星尘漂浮动画 ─────────────────────────────────────────

const float = keyframes`
  0% { transform: translateY(0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-120px) scale(0.6); opacity: 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// ─── 场景配置 ─────────────────────────────────────────────

interface SceneConfig {
  /** 叙事标题 */
  title: string;
  /** 叙事副标题 — 引导性文案 */
  narrative: string;
  /** 场景图标 */
  icon: React.ReactNode;
  /** 背景渐变 */
  gradient: string;
  /** 按钮文案 */
  actionLabel: string;
  /** 装饰符号 — 大背景水印 */
  watermark: string;
}

const scenes: Record<string, SceneConfig> = {
  /** 仪表盘 / 世界总览 */
  dashboard: {
    title: '很久以前，这里什么都没有……',
    narrative: '直到你到来。点亮第一颗星，让你的世界诞生。',
    icon: <AutoAwesomeIcon sx={{ fontSize: 48 }} />,
    gradient: 'linear-gradient(180deg, #0d1b2a 0%, #1a237e 60%, #283593 100%)',
    actionLabel: '点亮第一颗星',
    watermark: '✦',
  },
  /** 世界地图 */
  map: {
    title: '这片土地等待着你的描绘',
    narrative: '山川、河流、城池……一切的轮廓由你勾勒。',
    icon: <ExploreIcon sx={{ fontSize: 48 }} />,
    gradient: 'linear-gradient(180deg, #0d1b2a 0%, #1a3a5c 60%, #2e5a3e 100%)',
    actionLabel: '开启地图',
    watermark: '🗝',
  },
  /** 人物系统 */
  character: {
    title: '第一个人即将踏上这片土地',
    narrative: '英雄、智者、匠人……每个角色都有一段待书写的传奇。',
    icon: <PersonAddIcon sx={{ fontSize: 48 }} />,
    gradient: 'linear-gradient(180deg, #0d1b2a 0%, #1a237e 50%, #3f51b5 100%)',
    actionLabel: '创造第一个人物',
    watermark: '⚜',
  },
  /** 时间轴 */
  timeline: {
    title: '时间尚未开始流动……',
    narrative: '当第一件事发生，历史的齿轮将开始转动。',
    icon: <HourglassEmptyIcon sx={{ fontSize: 48 }} />,
    gradient: 'linear-gradient(180deg, #0d1b2a 0%, #283593 50%, #5c6bc0 100%)',
    actionLabel: '记录第一个事件',
    watermark: '⏳',
  },
  /** 编年史 */
  chronicle: {
    title: '史册的扉页还是空白的',
    narrative: '翻开它，让文字为你的世界作注。',
    icon: <MenuBookIcon sx={{ fontSize: 48 }} />,
    gradient: 'linear-gradient(180deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
    actionLabel: '翻开史册',
    watermark: '📜',
  },
  /** 势力/城市 */
  faction: {
    title: '大陆上还没有文明的踪迹',
    narrative: '谁将崛起？谁将称霸？故事由你书写。',
    icon: <PublicIcon sx={{ fontSize: 48 }} />,
    gradient: 'linear-gradient(180deg, #0d1b2a 0%, #1a237e 50%, #795548 100%)',
    actionLabel: '建立第一个势力',
    watermark: '⚔',
  },
};

// ─── 星尘粒子 ─────────────────────────────────────────────

interface StardustProps {
  count?: number;
}

const Stardust: React.FC<StardustProps> = ({ count = 20 }) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 8,
    duration: Math.random() * 4 + 4,
    opacity: Math.random() * 0.6 + 0.2,
  }));

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {particles.map((p) => (
        <Box
          key={p.id}
          sx={{
            position: 'absolute',
            left: p.left,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: '#ffd54f',
            opacity: 0,
            animation: `${float} ${p.duration}s ${p.delay}s infinite`,
          }}
        />
      ))}
    </Box>
  );
};

// ─── 主组件 ───────────────────────────────────────────────

export interface StoryEmptyStateProps {
  /** 场景类型 */
  scene: keyof typeof scenes;
  /** 自定义叙事标题（覆盖默认） */
  title?: string;
  /** 自定义叙事文案（覆盖默认） */
  narrative?: string;
  /** 主按钮点击 */
  onAction?: () => void;
  /** 按钮文案（覆盖默认） */
  actionLabel?: string;
  /** 是否全屏（仪表盘用） */
  fullScreen?: boolean;
  /** 自定义额外内容 */
  children?: React.ReactNode;
}

const StoryEmptyState: React.FC<StoryEmptyStateProps> = ({
  scene,
  title,
  narrative,
  onAction,
  actionLabel,
  fullScreen = false,
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const config = scenes[scene];

  useEffect(() => {
    // 延迟触发淡入，让过渡更自然
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const displayTitle = title ?? config.title;
  const displayNarrative = narrative ?? config.narrative;
  const displayAction = actionLabel ?? config.actionLabel;

  return (
    <Box
      sx={{
        width: '100%',
        height: fullScreen ? 'calc(100vh - 64px)' : '100%',
        minHeight: fullScreen ? undefined : 320,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: config.gradient,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 星尘粒子层 */}
      <Stardust count={24} />

      {/* 背景水印符号 */}
      <Box
        sx={{
          position: 'absolute',
          right: '10%',
          bottom: '5%',
          fontSize: '12rem',
          opacity: 0.04,
          color: '#ffd54f',
          userSelect: 'none',
          animation: `${pulse} 4s ease-in-out infinite`,
        }}
      >
        {config.watermark}
      </Box>

      {/* 核心内容 */}
      <Fade in={visible} timeout={800}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            px: 4,
            maxWidth: 480,
            zIndex: 1,
          }}
        >
          {/* 场景图标 */}
          <Box
            sx={{
              color: '#ffd54f',
              mb: 3,
              animation: `${pulse} 3s ease-in-out infinite`,
              filter: 'drop-shadow(0 0 8px rgba(255,213,79,0.4))',
            }}
          >
            {config.icon}
          </Box>

          {/* 叙事标题 */}
          <Typography
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              fontWeight: 700,
              fontSize: '1.2rem',
              color: '#ffd54f',
              mb: 1.5,
              lineHeight: 1.6,
              background: 'linear-gradient(90deg, #ffd54f, #ffe082, #ffd54f)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: `${shimmer} 4s linear infinite`,
            }}
          >
            {displayTitle}
          </Typography>

          {/* 叙事副标题 */}
          <Typography
            sx={{
              fontFamily: "'LXGW WenKai TC', serif",
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.9rem',
              mb: 4,
              lineHeight: 1.8,
              maxWidth: 360,
            }}
          >
            {displayNarrative}
          </Typography>

          {/* CTA 按钮 */}
          {onAction && (
            <Button
              startIcon={<AutoAwesomeIcon />}
              onClick={onAction}
              variant="contained"
              sx={{
                backgroundColor: '#ffd54f',
                color: '#1a237e',
                fontWeight: 800,
                fontSize: '1rem',
                px: 4,
                py: 1.2,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: '#ffca28',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 14px rgba(255,213,79,0.4)',
                },
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {displayAction}
            </Button>
          )}

          {/* 自定义额外内容 */}
          {children}
        </Box>
      </Fade>
    </Box>
  );
};

export default StoryEmptyState;
