# 世界圣典 · 项目总览

## 当前状态

### 已完成模块
- **视觉叙事方案**（Phase 1-3）：14 项任务全部完成 ✅
- **音频系统设计**：完整设计文档已完成 ✅
- **音频系统 Phase 1+2**：基础架构 + 程序化合成引擎 + 音效试听面板 ✅
- **音频系统 Phase 3**：12 组件交互音效集成 ✅
- **音频系统 Phase 4**：自适应音乐系统（MusicSystem + ProceduralMusic） ✅
- **音频系统 Phase 5**：环境声场系统（AmbienceSystem + ProceduralAmbience） ✅

### 最新完成

## 音频系统 Phase 3 — 交互音效集成 ✅

将 27 个 SFX 事件逐一接入 12 个业务组件，覆盖所有用户交互场景。

| 组件 | 接入音效 |
|------|---------|
| `SettingsDialog` | `sfx/export` / `sfx/import` / `ui/success` / SFXPreviewPanel |
| `SearchBar` | `ui/search_type` / `ui/search_result` |
| `RelationGraph` | `sfx/graph_node_select` |
| `EventForm` | `sfx/event_create` |
| `FactionForm` | `sfx/faction_color` |
| `MapPin` | `sfx/pin_drop` / `sfx/pin_hover` |
| `GridCanvas` | `sfx/paint_start` / `sfx/paint_stroke`（audioManager 直调） |
| `RelationForm` | `sfx/graph_link` |
| `ConfirmDialog` | `ui/click`（确认按钮） |
| `ChronicleReader` | `sfx/chronicle_scroll`（卷轴展开时） |
| `TimelineCanvas` | `sfx/timeline_scroll`（缩放操作） |
| `ConflictBadge` | `sfx/event_conflict`（冲突徽章点击） |

**TypeScript 编译**：0 错误 ✅

**下一步**：Phase 4（MusicSystem 状态机 + crossfade）→ Phase 5（AmbienceSystem）

## 音频系统 Phase 4 — 自适应音乐系统 ✅

5 状态音乐状态机 + 程序化音乐合成 + crossfade 平滑过渡。

| 文件 | 用途 |
|------|------|
| `src/services/audio/ProceduralMusic.ts` | 程序化音乐合成引擎：五声音阶 + 4 种循环音乐 + conflict stinger |
| `src/services/audio/MusicSystem.ts` | 状态机 + crossfade 引擎：silence/explore/create/epic/conflict |
| `src/services/audio/AudioManager.ts` | 接入 MusicSystem，activate() 自动初始化音乐引擎 |
| `src/components/layout/SettingsDialog.tsx` | 诊断面板增加音乐状态显示 |

**音乐状态映射**：
| 路由 | 音乐状态 | 风格 |
|------|---------|------|
| `/` (Dashboard) | explore | 钢琴+大提琴，宁静 |
| `/map` | explore | 同上 |
| `/characters` | explore | 同上 |
| `/timeline` | explore | 同上 |
| `/factions` | explore | 同上 |
| `/chronicle` | epic | 管弦乐+定音鼓，宏大 |
| 编辑表单打开 | create | 吉他+竹笛，温暖 |
| 冲突检测触发 | conflict | 紧张弦乐+stinger |
| 用户关闭音乐 | silence | 静音 |

**下一步**：Phase 5（AmbienceSystem 环境声场）

## 音频系统 Phase 5 — 环境声场 ✅

10 条程序化环境声 + 6 个场景映射 + crossfade 平滑过渡。整个音频系统全部完成。

| 文件 | 用途 |
|------|------|
| `src/services/audio/ProceduralAmbience.ts` | 10 条环境声合成：风声/鸟鸣/海浪/烛火/壁炉/翻书/书写/大厅回响等 |
| `src/services/audio/AmbienceSystem.ts` | 场景切换 + crossfade，循环播放 |
| `src/services/audio/AudioManager.ts` | 接入 AmbienceSystem |

**场景→环境声映射**：
| 场景 | 环境声 |
|------|--------|
| ambient（Dashboard） | 微风+树叶 |
| map（地图页） | 微风+树叶 |
| library（人物/势力） | 图书馆翻书 |
| candle（时间轴） | 烛火噼啪 |
| hall（编年史） | 大厅回响 |
| writing（关系图） | 书写声 |

---

## 🎉 音频系统全部完成（Phase 1-5）

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 1 | 基础架构（AudioManager + audioStore + hooks） | ✅ |
| Phase 2 | 程序化音效合成引擎（27 SFX） | ✅ |
| Phase 3 | 12 组件交互音效集成 | ✅ |
| Phase 4 | 自适应音乐系统（5 状态 + crossfade） | ✅ |
| Phase 5 | 环境声场（10 条 + 6 场景） | ✅ |

**零外部音频文件，零网络请求**——所有声音由 Web Audio API 程序化合成。

## 音频系统 Phase 1+2 — 基础架构 + 程序化合成 ✅

**核心变更**：用 Web Audio API 程序化合成替代外部音效文件，零依赖，零网络请求。

| 文件 | 用途 |
|------|------|
| `src/store/audioStore.ts` | Zustand 音频设置 store，localStorage 持久化 |
| `src/services/audio/AudioManager.ts` | 核心单例：AudioContext + 三总线 + voice stealing + buffer 注入 |
| `src/services/audio/ProceduralSFX.ts` | **~600行合成引擎**：12 种合成原语 + 27 个 SFX + OfflineAudioContext 渲染 |
| `src/services/audio/SFXPlayer.ts` | 初始化：合成→注入→注册一条龙 |
| `src/hooks/useAudio.ts` | 全局 Hook：路由→音乐 + 冲突联动 |
| `src/hooks/useSFX.ts` | 组件级 Hook：play() + 11 个快捷方法 |

**音效试听面板**：SettingsDialog 音频设置 Tab 内置可折叠面板，27 个 SFX 点击试听 + 实时诊断（合成状态/已加载/活跃声道）。

**声音身份**：古朴 · 温暖 · 神秘（木质共鸣/金属微振/纸张摩擦/水晶叮响/古典鼓点）

**下一步**：Phase 3（逐组件交互音效集成）→ Phase 4（音乐系统状态机）→ Phase 5（环境声场）

---

## 音频系统设计 ✅

**文件**: `docs/audio-system-design.md`

基于 Web Audio API 设计了完整的自适应音频系统，包含：

| 模块 | 内容 |
|------|------|
| UI 音效 | 12 类 × 3 变体 = 36 个，涵盖按钮/弹窗/搜索/成功/失败 |
| 交互音效 | 15 类，涵盖卡片翻转/图钉放置/画笔/时间轴/关系图/编年史 |
| 自适应音乐 | 5 状态（silence/explore/create/epic/conflict），路由+数据驱动切换 |
| 环境声场 | 10 条环境声，按页面和地图地形类型动态混合 |
| 性能预算 | 同时 Voice ≤ 8，内存 ≤ 5MB，DSP ≤ 2ms/帧 |
| React 集成 | `useAudio` 全局 Hook + `useSFX` 组件级 Hook + `audioStore` 设置持久化 |

**技术决策**：
- 放弃 FMOD/Wwise（Web 应用无原生中间件支持）
- Web Audio API 自建轻量 AudioManager
- 音乐格式：WebM(Opus) + MP3(Safari fallback)
- Zustand 状态 → 音频参数自动驱动

---

## 视觉叙事方案 · 全三阶段实施报告

**Phase 1「基础叙事层」**（6 项）、**Phase 2「深度叙事层」**（5 项）、**Phase 3「沉浸叙事层」**（3 项）——全部 14 项任务完成 ✅

### Phase 1 — 基础叙事层 ✅

**新增文件**:
| 文件 | 用途 |
|------|------|
| `src/theme/narrativeTokens.ts` | 色彩令牌体系 |
| `src/theme/transitions.ts` | 动画令牌体系 |
| `src/components/common/StoryEmptyState.tsx` | 叙事化空状态组件 |

**修改文件**: `Sidebar.tsx` / `CharacterCard.tsx` / `DashboardPage.tsx`

### Phase 2 — 深度叙事层 ✅

**新增文件**: `src/constants/eventIcons.ts`
**修改文件**: `RelationGraph.tsx` / `TimelineCanvas.tsx` / `MapCityMarker.tsx` / `ChronicleReader.tsx` / `ChroniclePage.tsx`

### Phase 3 — 沉浸叙事层 ✅

**新增文件**: `src/components/common/PageTransition.tsx`
**修改文件**: `AppShell.tsx` / `ConflictBadge.tsx` / `DashboardPage.tsx`
