# RealmKit 项目记忆

## 项目概要
- 名称：RealmKit（世界圣典）
- 类型：架空历史世界构建工具
- 技术栈：React 18 + TypeScript 5 + Vite 5 + MUI 5 + Zustand 4
- 路径：`C:\Codebase\RealmKit\`

## 核心模块
- `src/components/character/` — 人物卡片系统（三国杀武将牌风格 v2.0）
- `src/pages/CharacterPage.tsx` — 人物主页面（网络图/卡片双视图 + 主从联动）
- `src/types/index.ts` — 全局类型定义（WorldData/Character/CardRarity 等）
- `src/utils/rarity.ts` — 稀有度自动计算引擎
- `src/store/worldStore.ts` — Zustand 世界状态管理

## 设计约定
- 人物卡片：三国杀 5:7 竖版比例 + 12 区解剖模型 + 稀有度四级体系
- 暗色羊皮纸底色（#1a100a）+ 势力色描金 + 金色装饰（#c9a050）
- 字体：'LXGW WenKai TC', 'Noto Serif SC', 'SimSun', serif
- 打印卡片：63×88mm 物理尺寸，A4 纸 3×3 排版

## 当前状态
- Phase 1-4 已完成（数据模型/卡片布局/导出/稀有度体系）
- Phase 5 已完成（打印功能：CharacterCardPrint + PrintSheet + PrintPreviewDialog）
- 编译状态：tsc --noEmit 0 errors，vite build 通过
