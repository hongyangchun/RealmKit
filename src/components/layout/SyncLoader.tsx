/**
 * SyncLoader — 初始同步加载器
 *
 * 在 App 最外层包裹，处理首次 D1 数据合并：
 * 1. 检测是否有 CF_Authorization cookie（是否已认证）
 * 2. 如果已认证 → 从 D1 拉取数据，与 localStorage 合并（last-write-wins）
 * 3. 如果未认证 → 纯本地模式，不显示加载状态
 *
 * 同步期间显示简洁的进度指示器
 */
import React, { useEffect, useState } from 'react';
import { Box, LinearProgress, Typography, Theme } from '@mui/material';
import { syncService } from '../../services/syncService';
import { storageAdapter } from '../../services/storageAdapter';
import { useWorldStore } from '../../store/worldStore';

interface SyncLoaderProps {
  children: React.ReactNode;
}

type SyncState = 'idle' | 'syncing' | 'done' | 'error';

const SyncLoader: React.FC<SyncLoaderProps> = ({ children }) => {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const importWorld = useWorldStore((s) => s.importWorld);

  useEffect(() => {
    let cancelled = false;

    async function performInitialSync() {
      // 未认证 → 纯本地模式，跳过
      if (!syncService.isAuthenticated()) {
        setSyncState('done');
        return;
      }

      setSyncState('syncing');

      try {
        // 读取本地数据
        const localWorld = storageAdapter.load();

        // 执行初始同步（合并 D1 数据）
        const result = await syncService.initialSync(localWorld);

        if (cancelled) return;

        // 如果有云端数据需要写入 store
        if (result.world) {
          // 写入 localStorage（保持一致性）
          storageAdapter.save(result.world);
          // 更新 Zustand store
          importWorld(result.world);
        }

        // 如果有云端编年史需要写入
        if (result.chronicles) {
          try {
            localStorage.setItem('zzworld_chronicles', JSON.stringify(result.chronicles));
          } catch {
            // ignore
          }
        }

        setSyncState('done');
      } catch (error) {
        console.warn('[SyncLoader] 初始同步失败，使用本地数据:', error);
        if (!cancelled) {
          setSyncState('error');
          // 失败后仍然显示应用（使用本地数据）
          setTimeout(() => setSyncState('done'), 1500);
        }
      }
    }

    performInitialSync();

    return () => {
      cancelled = true;
    };
  }, [importWorld]);

  // 同步中显示加载画面
  if (syncState === 'idle' || syncState === 'syncing') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        <Typography variant="h6" color="text.secondary">
          {syncState === 'idle' ? '准备中...' : '正在同步世界数据...'}
        </Typography>
        <Box sx={{ width: 240 }}>
          <LinearProgress
            sx={(theme: Theme) => ({
              height: 6,
              borderRadius: 3,
              bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
            })}
          />
        </Box>
      </Box>
    );
  }

  // 同步失败提示（短暂显示后消失）
  if (syncState === 'error') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        <Typography variant="h6" color="warning.main">
          同步失败，使用本地数据
        </Typography>
      </Box>
    );
  }

  // 同步完成 → 渲染应用
  return <>{children}</>;
};

export default SyncLoader;
