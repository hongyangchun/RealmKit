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
        // 读取本地数据（记录快照时间戳）
        const localWorld = storageAdapter.load();
        const localSnapshotUpdatedAt = localWorld?.meta?.updatedAt ?? '';

        // 执行初始同步（合并 D1 数据）
        const result = await syncService.initialSync(localWorld);

        if (cancelled) return;

        // 二次校验：同步期间本地数据可能被其他进程修改
        // 重新读取 localStorage 最新状态，避免用旧云端数据覆盖新本地数据
        if (result.world) {
          const latestLocal = storageAdapter.load();
          const latestUpdatedAt = latestLocal?.meta?.updatedAt ?? '';

          if (latestUpdatedAt > localSnapshotUpdatedAt) {
            // 本地数据在同步等待期间被修改了（理论上不应发生，但做防护）
            console.warn(
              '[SyncLoader] 本地数据在同步期间被修改，跳过云端覆盖',
              { before: localSnapshotUpdatedAt, after: latestUpdatedAt }
            );
            // 以本地最新数据为准，推送到云端
            if (latestLocal) {
              syncService.syncWorld(latestLocal);
            }
          } else {
            // 正常：本地无变化，用云端数据覆盖
            console.log('[SyncLoader] 使用云端数据更新本地');
            storageAdapter.save(result.world);
            importWorld(result.world);
          }
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
