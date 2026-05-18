/**
 * AppShell - 整体布局容器
 * TopBar + Sidebar + 主内容区
 * 全局音频 Hook 挂载点
 * 全局拖拽导入支持
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Toolbar, Typography, Fade } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import PageTransition from '../common/PageTransition';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAudio } from '../../hooks/useAudio';
import { useWorldStore } from '../../store/worldStore';
import { importExportService } from '../../services/importExport';

const DRAWER_WIDTH = 240;
const COLLAPSED_WIDTH = 64;

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const importWorld = useWorldStore((s) => s.importWorld);

  // 全局音频：监听路由变化 + 冲突状态
  useAudio();

  const handleToggleSidebar = () => setSidebarOpen((prev) => !prev);

  // ── 拖拽导入 ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 检查是否有 .json 文件
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有离开最外层容器才关闭
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX <= rect.left || clientX >= rect.right || clientY <= rect.top || clientY >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.json')) {
      return;
    }
    setPendingFile(file);
    setConfirmOpen(true);
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!pendingFile) return;
    try {
      const result = await importExportService.importFromFile(pendingFile);
      importWorld(result.world);
      importExportService.restoreExtras(result);
      window.location.reload();
    } catch (err) {
      alert((err as Error).message);
    }
    setConfirmOpen(false);
    setPendingFile(null);
  }, [pendingFile, importWorld]);

  // 全局 window 级别拖拽监听（防止浏览器默认打开文件）
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);
    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

  return (
    <Box
      sx={{ display: 'flex', minHeight: '100vh', background: '#faf3e0', position: 'relative' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <TopBar
        sidebarOpen={sidebarOpen}
        drawerWidth={DRAWER_WIDTH}
        collapsedWidth={COLLAPSED_WIDTH}
        onToggleSidebar={handleToggleSidebar}
      />
      <Sidebar
        open={sidebarOpen}
        drawerWidth={DRAWER_WIDTH}
        collapsedWidth={COLLAPSED_WIDTH}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          minHeight: '100vh',
          background: '#faf3e0',
          overflow: 'hidden',
        }}
      >
        {/* Offset for fixed AppBar */}
        <Toolbar />
        <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <PageTransition>
            {children}
          </PageTransition>
        </Box>
      </Box>

      {/* 拖拽覆盖层 */}
      <Fade in={isDragging}>
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(26, 35, 126, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 80, color: '#ffd54f', mb: 2 }} />
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, fontFamily: "'LXGW WenKai TC', serif" }}>
            松开以导入世界数据
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
            支持 .json 导出文件（世界数据 / 完整备份）
          </Typography>
        </Box>
      </Fade>

      {/* 拖拽导入确认对话框 */}
      <ConfirmDialog
        open={confirmOpen}
        title="确认导入数据？"
        message="导入将覆盖当前所有世界数据。如果是完整备份，AI 配置和编年史也会被恢复。"
        confirmLabel="确认导入"
        cancelLabel="取消"
        severity="warning"
        onConfirm={handleConfirmImport}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingFile(null);
        }}
      />
    </Box>
  );
};

export default AppShell;
