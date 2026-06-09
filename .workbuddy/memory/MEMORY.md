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

## 云同步（D1）方案（2026-05-18 实现，2026-05-20 修复）
- **策略**：local-first，写 localStorage 后后台异步同步到 D1
- **认证**：Cloudflare Access JWT（`CF_Authorization` cookie）
- **同步入口**：只改 `persist()` 和 `saveChronicles()` 两处，覆盖所有写入路径
- **Debounce**：2 秒（覆盖高频 paintCell/eraseCell 操作）
- **合并策略**：世界数据 last-write-wins（比较 updatedAt 时间戳）；编年史基于条目 ID 合并（本地为主，补充云端缺失条目）
- **AI 配置不同步**（含 API Key，安全考虑）
- **SyncLoader**：App 最外层包裹，首次加载时合并 D1 数据，含二次校验防止竞态覆盖
- **设置面板**：数据管理 Tab 显示同步状态、上次同步时间、手动同步按钮、同步错误提示

### D1 部署关键（2026-05-20 踩坑）
- **`wrangler.toml` 必须声明 `pages_build_output_dir = "dist"`**，否则 Pages Functions 不注入 D1 binding，API 全部 500
- GitHub 自动部署（Pages CI）不会读取 wrangler.toml 的 binding；需用 `npx wrangler pages deploy` 部署才能生效
- **D1 database_id**：`7b3fba7f-5aa8-40a3-b149-5449d304a1ea`（zzworld-db）
- **同步失败不再静默**：syncService 追踪 `_lastError` 和 `_consecutiveFailures`，设置面板在连续失败时显示红色错误 Alert

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

## GridCanvas 架构要点
- **两个实例共享同一 Zustand store**：MapViewer（编辑器）和 ReadOnlyMapPreview（仪表盘预览）
- **initGrid useEffect**：仅在非 readOnly 模式下调用 initGrid，避免 ReadOnlyMapPreview 覆盖种子生成器的网格尺寸
- **方案B 缩放**：独立 X/Y 缩放（scaleX/scaleY），地图始终填满容器，不保留等比黑边
- **种子生成器固定尺寸**：100×100 grid，cellSize=10，mapGenerator 生成地形和领地

## 代码规范
- 中文注释，中文 UI 文案
- 世界中世纪风格配色：#1a237e（主蓝）、#5D4037（棕色）、#faf3e0（羊皮纸底色）
- 字体：LXGW WenKai TC（标题）、系统字体（正文）
