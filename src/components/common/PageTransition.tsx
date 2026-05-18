/**
 * PageTransition - 页面过渡动画包装组件
 *
 * 监听路由变化，触发淡入 + 轻微缩放的叙事过渡。
 * 使用 transitions.ts 中的令牌保持全局一致。
 * 支持 prefers-reduced-motion。
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { fadeIn, slideUpFade, duration, easing, reducedMotionOverride } from '../../theme/transitions';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);

  // 路由变化时触发过渡
  useEffect(() => {
    // 新路由：先淡出旧内容
    setIsVisible(false);

    const exitTimer = setTimeout(() => {
      // 切换内容
      setDisplayChildren(children);
      // 淡入新内容
      setIsVisible(true);
    }, duration.normal);

    return () => clearTimeout(exitTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // 首次渲染直接展示
  useEffect(() => {
    setDisplayChildren(children);
    setIsVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      sx={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.99)',
        transition: `opacity ${duration.slow}ms ${easing.decelerate}, transform ${duration.slow}ms ${easing.decelerate}`,
        animation: `${slideUpFade} ${duration.normal}ms ${easing.decelerate} both`,
        height: '100%',
        ...reducedMotionOverride,
      }}
    >
      {displayChildren}
    </Box>
  );
};

export default PageTransition;
