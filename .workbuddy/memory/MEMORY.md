# 世界圣典 ZZWorld Chronicle — 项目记忆

## 技术栈
- React 18 + TypeScript + Vite 5 + MUI 5 + Zustand 4
- react-force-graph-2d（力导向图）、Fuse.js（模糊搜索）、GridCanvas（地图）
- 部署：Cloudflare Pages（纯 SPA，_redirects 做 SPA routing）

## 存储架构
- 3 个 localStorage key：`zzworld_data`（WorldData）、`zzworld_ai_config`（AiConfig）、`zzworld_chronicles`（ChronicleEntry[]）
- `IStorageAdapter` 同步接口，`LocalStorageAdapter` 单例实现
- `worldStore.ts` 的 `persist()` 函数覆盖全部 35+ 个同步写入点
- `useAiConfig` 和 `useChronicles` 直接操作 localStorage，不经 IStorageAdapter

## 云同步（D1）方案（2026-05-18 实现）
- **策略**：local-first，写 localStorage 后后台异步同步到 D1
- **认证**：Cloudflare Access JWT（`CF_Authorization` cookie）
- **同步入口**：只改 `persist()` 和 `saveChronicles()` 两处，覆盖所有写入路径
- **Debounce**：2 秒（覆盖高频 paintCell/eraseCell 操作）
- **合并策略**：last-write-wins（比较 updatedAt 时间戳）
- **AI 配置不同步**（含 API Key，安全考虑）
- **SyncLoader**：App 最外层包裹，首次加载时合并 D1 数据
- **设置面板**：数据管理 Tab 显示同步状态、上次同步时间、手动同步按钮

### 新增文件
- `schema.sql` — D1 数据库 schema（worlds/chronicles/sync_meta 三张表）
- `wrangler.toml` — D1 binding 配置（database_id 需替换）
- `functions/api/_middleware.ts` — Access JWT 认证中间件
- `functions/api/world.ts` — 世界数据 GET/POST API
- `functions/api/chronicles.ts` — 编年史 GET/POST API
- `src/services/syncService.ts` — 客户端同步服务（debounce + fetch + 离线重试）
- `src/components/layout/SyncLoader.tsx` — 初始同步加载器

### 修改文件
- `src/store/worldStore.ts` — persist() 添加 syncService.syncWorld()
- `src/hooks/useChronicles.ts` — saveChronicles() 添加 syncService.syncChronicles()
- `src/App.tsx` — 包裹 `<SyncLoader>`
- `src/components/layout/SettingsDialog.tsx` — 添加云同步状态 UI
- `public/_redirects` — 添加 /api/* 规则

## 导入导出（已完成）
- FullBackup v2 格式（version: 2），包含 world + aiConfig + chronicles
- 全局拖拽导入（AppShell）、备份提醒（7 天阈值）
- `src/services/importExport.ts` — ImportExportService 单例
- `src/services/backupTracker.ts` — 备份时间追踪

## 代码规范
- 中文注释，中文 UI 文案
- 世界中世纪风格配色：#1a237e（主蓝）、#5D4037（棕色）、#faf3e0（羊皮纸底色）
- 字体：LXGW WenKai TC（标题）、系统字体（正文）
