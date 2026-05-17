# ZZWorld Chronicle 代码审查报告

> 审查日期：2026-05-17  
> 审查范围：全部 87 个源文件（src/ 目录下所有 .ts/.tsx 文件）  
> 审查方法：5 个并行审查代理分模块通读，按 BUG / OPTIMIZE / WARNING 三级分类

---

## 📊 总览

| 严重级别 | 数量 | 说明 |
|----------|------|------|
| 🔴 BUG | **17** | 运行时崩溃、逻辑错误、数据丢失 |
| 🟡 OPTIMIZE | **24** | 性能问题、不必要的重复计算 |
| 🔵 WARNING | **49** | 代码质量、潜在风险、一致性 |
| **合计** | **90** | |

---

## 🔴 BUG（17 项）— 按严重程度排序

### BUG-01 | LifecycleBar.tsx — React Hooks 规则违规（会崩溃）
**文件**: `src/components/character/LifecycleBar.tsx`  
**行号**: 55（useMemo 在条件 return 之后）

`useMemo` 位于第 27-29 行的 `if (...) return null` 之后。当组件首次渲染 `characterEvents.length === 0` 时跳过 `useMemo`，后续有事件时调用，改变了 Hook 调用顺序，**会导致 React 运行时崩溃**。

**修复**: 将 early return 移到所有 Hook 之后。

---

### BUG-02 | GridCanvas.tsx — `ctx.roundRect()` 兼容性缺失（Safari 崩溃）
**文件**: `src/components/map/GridCanvas.tsx`  
**行号**: 481

`ctx.roundRect()` 是较新的 Canvas API，Safari < 16.0 和旧版 Chromium 不支持，会抛出 `TypeError: ctx.roundRect is not a function`。

**修复**: 用 `moveTo` + `lineTo` + `arcTo` 手绘圆角矩形。

---

### BUG-03 | GridCanvas.tsx — 缺少 DPI/Retina 缩放（高分屏模糊）
**文件**: `src/components/map/GridCanvas.tsx`  
**行号**: 228-231, 731-745

Canvas 像素尺寸直接用 CSS 像素值，未考虑 `devicePixelRatio`。在 Retina 屏（DPR > 1）上渲染模糊。

**修复**: `canvas.width = width * devicePixelRatio`，context scale by DPR，CSS 尺寸设为原始值。

---

### BUG-04 | MapCanvas.tsx — GridCanvas 未连接点击事件（地图放置功能失效）
**文件**: `src/components/map/MapCanvas.tsx`  
**行号**: 257

`<GridCanvas>` 未传递 `onCanvasClick`、`onPanZoomChange`、`onHoverFaction` props。同时旧版 div 点击处理器（line 72）跳过了 canvas 上的点击。**用户无法在地图上放置标记或城市**。

**修复**: 参照 MapViewer.tsx:346-353 传递完整 props。

---

### BUG-05 | AiSettingsDialog.tsx — 三元表达式永远返回 false
**文件**: `src/components/chronicle/AiSettingsDialog.tsx`  
**行号**: 237

```tsx
disabled={formData.modelName && !PRESET_MODELS.find(...)?.model ? false : false}
```

两个分支都返回 `false`，`disabled` 永远为 `false`，开发者意图被丢失。

**修复**: 修正逻辑，其中一个分支应返回 `true`。

---

### BUG-06 | ChroniclePage.tsx — 非空断言导致空引用崩溃
**文件**: `src/pages/ChroniclePage.tsx`  
**行号**: 410, 421, 433

`menuEntry!` 在点击处理器中使用。`handleMenuClose` 先将 `menuEntry` 设为 `null`，随后异步点击处理器访问 `menuEntry!` 时已经是 `null`。

**修复**: 在关闭前捕获 `menuEntry` 的值，或使用空值检查。

---

### BUG-07 | FactionCityPage.tsx / FactionPage.tsx — `undefined.toLowerCase()` 崩溃
**文件**: `src/pages/FactionCityPage.tsx` 行 153, `src/pages/FactionPage.tsx` 行 63

```tsx
f.description.toLowerCase()  // description 可能为 undefined
```

`Faction` 的 `description` 字段可能为空，直接调用 `.toLowerCase()` 会抛出 TypeError。

**修复**: `(f.description ?? '').toLowerCase()`

---

### BUG-08 | DashboardPage.tsx — 城市统计链接指向错误页面
**文件**: `src/pages/DashboardPage.tsx`  
**行号**: 84

```tsx
{ label: '城市', value: cities.length, path: '/factions' }
```

城市数量统计链接到 `/factions` 而非 `/cities`。

**修复**: 改为 `path: '/cities'`。

---

### BUG-09 | ChroniclePage.tsx — href 导致整页刷新
**文件**: `src/pages/ChroniclePage.tsx`  
**行号**: 269

```tsx
<Button variant="outlined" href="/factions">
```

在 SPA 中使用 `href` 导致整页刷新而非客户端导航。

**修复**: 使用 `onClick={() => navigate('/factions')}`。

---

### BUG-10 | storageAdapter.ts — 大小检查用字符数代替字节数
**文件**: `src/services/storageAdapter.ts`  
**行号**: 27

`string.length` 计算的是 UTF-16 代码单元，不是字节。中文字符在 UTF-8 中占 3 字节，实际存储大小被严重低估。5MB 字符串可能实际 10-15MB。

**修复**: 使用 `new TextEncoder().encode(serialized).length` 获取真实字节数。

---

### BUG-11 | worldStore.ts — 浅合并丢失嵌套默认值
**文件**: `src/store/worldStore.ts`  
**行号**: 219-220

```tsx
{ ...DEFAULT_WORLD_DATA, ...saved }
```

浅合并会在 `saved` 包含部分 `meta` 对象时丢失 `DEFAULT_WORLD_DATA.meta` 中的字段。

**修复**: 对 `meta` 等嵌套对象做深度合并。

---

### BUG-12 | worldStore.ts — 无效的三元表达式（no-op）
**文件**: `src/store/worldStore.ts`  
**行号**: 874-876

```tsx
eventIds: (c.eventIds ?? []).map((ref) =>
  ref.startsWith('event_') ? ref : ref  // 两个分支相同
),
```

三元表达式两分支返回相同值，`.map()` 是空操作。

**修复**: 删除此 map 或修正转换逻辑。

---

### BUG-13 | worldStore.ts — 映射丢失时静默过滤数据
**文件**: `src/store/worldStore.ts`  
**行号**: 860-866

```tsx
factionIds: e.factionIds.map((ref) => factionPlaceholderToId[ref]).filter(Boolean)
```

未找到的占位符引用返回 `undefined` 后被 `.filter(Boolean)` 静默丢弃，可能导致数据丢失无提示。

**修复**: 对未映射引用添加 `console.warn`。

---

### BUG-14 | CharacterPage.tsx — 大数组展开导致 RangeError
**文件**: `src/pages/CharacterPage.tsx`  
**行号**: 101

```tsx
Math.min(...years)  // years 可能很大
```

JS 引擎参数上限约 65536，大数组会抛 RangeError。

**修复**: 用 `years.reduce((a, b) => Math.min(a, b), Infinity)`。

---

### BUG-15 | StorySeedDialog.tsx — 提前返回阻止关闭动画
**文件**: `src/components/common/StorySeedDialog.tsx`  
**行号**: 31-33

`if (!storySeed) return null` 在 `<Dialog>` 渲染之前返回，导致关闭时 Dialog 组件被立即卸载，退出动画无法播放。

**修复**: 始终渲染 Dialog，内部条件渲染内容。

---

### BUG-16 | MiniMapPreview.tsx — Math.min 与 CSS 字符串比较失效
**文件**: `src/components/dashboard/MiniMapPreview.tsx`  
**行号**: 461

```tsx
left: Math.min(hoverInfo.x + 12, 'calc(100% - 100px)' as any)
```

`Math.min(数字, 字符串)` → `NaN`，CSS 字符串总是被返回，右侧边缘限制逻辑**完全失效**。

**修复**: 使用 `Math.min(hoverInfo.x + 12, containerWidth - 100)` 传入实际像素值。

---

### BUG-17 | ReadOnlyMapPreview.tsx — Cell key 格式不匹配
**文件**: `src/components/dashboard/ReadOnlyMapPreview.tsx`  
**行号**: 122

```tsx
const cellKey = `territory:${gridX},${gridY}`;
```

使用 `territory:` 前缀查找 cell，但 MiniMapPreview 中 cell key 是 `${gx},${gy}` 格式。查找永远失败，阵营领地点击检测无效。

**修复**: 统一 cell key 格式。

---

## 🟡 OPTIMIZE（24 项）— 按影响程度排序

### 性能关键

| # | 文件 | 行号 | 描述 |
|---|------|------|------|
| O-01 | `store/worldStore.ts` | 全部 action | `isDirty` 始终为 `false`，是死代码，应移除或修正逻辑 |
| O-02 | `FactionCard.tsx` | 51-56 | Zustand 内联 `.filter()` 选择器每次创建新数组，触发所有 store 变更的 re-render |
| O-03 | `FactionOverviewCard.tsx` | 19-23 | 同上，选择器粒度过粗 |
| O-04 | `CharacterPage.tsx` | 106-119 | `filteredCharacters` 未 memoize，每次渲染重新过滤 |
| O-05 | `CharacterPage.tsx` | 426 | O(n*m) 事件过滤在渲染循环中 |
| O-06 | `GridCanvas.tsx` | 290-308 | O(layers × cells) 渲染循环，应按 layerId 预分组 |
| O-07 | `GridCanvas.tsx` | 312-400 | 领地边框双遍迭代，可合并为单遍 |
| O-08 | `MiniMapPreview.tsx` | 197-202 | 100×100 网格多次遍历 + 重复 key 解析 |
| O-09 | `MapCityMarker.tsx` | 85-110 | drag 位置变化触发 listener 反复注册/注销 |
| O-10 | `RelationGraph.tsx` | 75 | O(n×m) faction 查找，应用 Map |
| O-11 | `TimelineCanvas.tsx` | 114-134 | `computeRowLanes` 未 memoize |
| O-12 | `WorldSeedWizard.tsx` | 217,235,347,509 | 组件定义在渲染函数内，每次 re-render 导致卸载重挂 |

### 代码质量

| # | 文件 | 行号 | 描述 |
|---|------|------|------|
| O-13 | `App.tsx` | 5 | 未使用的 `React` import（react-jsx 模式下） |
| O-14 | `store/worldStore.ts` | 461, 492 | `let` 应为 `const` |
| O-15 | `graphNarrativeService.ts` | 107 | 叙事拼接缺少分隔符 |
| O-16 | `CharacterDetailPanel.tsx` | 49-66 | 6+ 个独立 Zustand 订阅可合并 |
| O-17 | `CharacterCard.tsx` | 54-59 | 多个独立选择器可合并 |
| O-18 | `CharacterDrawer.tsx` | 248-289 | 原生 `<button>` 代替 MUI `<Button>` |
| O-19 | `CharacterDetailPanel.tsx` | 145 | 大数组展开 Math.min/max |
| O-20 | `CharacterDrawer.tsx` | 90 | 同上 |
| O-21 | `CharacterCardExporter.tsx` | 405-411 | 重复的 `lighten` 函数（与 AvatarGenerator.ts 不同实现） |
| O-22 | `plotSuggestionService.ts` | 107,159 | `sort(() => Math.random()-0.5)` 非均匀洗牌，应用 Fisher-Yates |
| O-23 | `useConflicts.ts` | 19-26 | 函数未 memoize |
| O-24 | `useWorldData.ts` | 35-43 | 函数未 memoize |

---

## 🔵 WARNING（49 项）— 分类汇总

### 类型安全 & 模式问题

| # | 文件 | 描述 |
|---|------|------|
| W-01 | `types/index.ts:51` | `Relation.type` 为松散 `string`，应使用联合类型 |
| W-02 | `types/index.ts:241` | 运行时常量 `TERRAIN_COLORS` 不应在类型文件中 |
| W-03 | `store/worldStore.ts:179,192` | 迁移代码中多处 `as any` |
| W-04 | `store/worldStore.ts:807` | 局部 `DEFAULT_GRID` 遮蔽模块级同名常量 |
| W-05 | `constants/cityTypes.ts:9,18` | `Record<string, string>` 应为 `Record<City['type'], string>` |
| W-06 | `constants/relationTypes.ts:12` | 同上模式 |
| W-07 | `AvatarGenerator.ts:78` | `canvas.getContext('2d')!` 非空断言 |
| W-08 | `AvatarUploader.tsx:64` | 同上 |
| W-09 | `AvatarUploader.tsx:69` | `reader.result as string` 绕过类型检查 |
| W-10 | `WorldSeedPreview.tsx:31+` | 5+ 次重复 `as WorldSeedResult & { cities?: unknown[] }` 类型断言 |
| W-11 | `tsconfig.app.json:15-16` | `noUnusedLocals/Parameters` 被禁用 |

### React 模式

| # | 文件 | 描述 |
|---|------|------|
| W-12 | `CharacterForm.tsx:68-82` | useEffect 缺少依赖（wrapped setters） |
| W-13 | `CityForm.tsx:80-103` | 同上 |
| W-14 | `FactionForm.tsx:93` | 同上 |
| W-15 | `WorldSeedWizard.tsx:93` | 同上 |
| W-16 | `ChronicleForm.tsx:50-78` | useState 初始值来自 props 计算，后续 props 变化时状态不更新 |
| W-17 | `EventForm.tsx:99` | `events` 未在 useEffect 依赖中 |
| W-18 | `ChronicleReader.tsx:36` | hooks 之前的 early return（当前安全但脆弱） |
| W-19 | `RelationForm.tsx:68` | `resetDirty()` 在 `if(open)` 外调用 |
| W-20 | `WorldSeedWizard.tsx:67-68` | `d()` wrapper 每次渲染创建新引用 |
| W-21 | `FactionForm.tsx:67-68` | 同上 |
| W-22 | `FactionForm.tsx:86` | useEffect 中 `Math.random()` 非确定性 |
| W-23 | `CharacterDrawer.tsx:87` | 冗余的 null 检查 |

### CSS & UI

| # | 文件 | 描述 |
|---|------|------|
| W-24 | `index.css:26-30` | `[style*="font-family: serif"]` 属性选择器脆弱 |
| W-25 | `index.css:49-61` | 过度使用 `!important` 覆盖 MUI |
| W-26 | `FactionOverviewCard.tsx:94` | 8 位 hex 颜色透明度兼容性问题 |
| W-27 | `MarkerDetailDialog.tsx:401-444` | 深色背景上深色文字（不可读），仅 PinDetail 正确使用白色文字 |
| W-28 | `SettingsDialog.tsx:164` | 用 `alert()` 而非 Snackbar |
| W-29 | `PinDrawer.tsx:109-146` | 原生 `<button>` 代替 MUI `<Button>` |
| W-30 | `TimelineCanvas.tsx:201-205` | CSS scale 变换可能导致滚动问题 |
| W-31 | `SearchBar.tsx:115` | 已弃用的 ListItem `button` prop |

### 数据 & 存储

| # | 文件 | 描述 |
|---|------|------|
| W-32 | `main.tsx:8` | `document.getElementById('root')!` 非空断言 |
| W-33 | `storageAdapter.ts:23-36` | 存储失败时静默丢失，无用户提示 |
| W-34 | `useAiConfig.ts:28-29` | localStorage 解析无运行时校验 |
| W-35 | `useAiConfig.ts:36` | localStorage 写入无 try/catch |
| W-36 | `useChronicles.ts:50` | `isLoading` 状态从未设为 `true`（死代码） |
| W-37 | `importExport.ts:17` | 文件名未过滤不安全字符 |
| W-38 | `importExport.ts:53-65` | Schema 校验过于宽松 |
| W-39 | `store/searchStore.ts:18` | `setQuery` 副作用式设置 `isOpen` |

### Services & 工具

| # | 文件 | 描述 |
|---|------|------|
| W-40 | `utils/color.ts:17` | `isLightColor` 无输入校验，畸形 hex 产生 NaN |
| W-41 | `aiService.ts:185,193` | 脆弱的 emoji 正则解析 LLM 输出 |
| W-42 | `plotSuggestionService.ts:226-266` | 与 aiService.ts 重复的 API 调用代码 |
| W-43 | `storySeedService.ts:100` | 空字符串 location 未过滤 |
| W-44 | `storySeedService.ts:56,63` | `Math.random()` 导致非确定性结果 |
| W-45 | `worldSeedGenerator.ts:341` | 模板值含 `$` 时 replace 行为异常 |
| W-46 | `worldSeedGenerator.ts:441` | 回退描述固定使用 fantasy 风格 |
| W-47 | `mapGenerator.ts:111` | LCG 公式中无意义的 `+ 0` |

### 未使用 / 死代码

| # | 文件 | 描述 |
|---|------|------|
| W-48 | `ReadOnlyMapPreview.tsx:48-49` | `drawerOpen` 状态从未使用 |
| W-49 | `MapCityMarker.tsx:39` | `dragStartRef` 赋值后从未读取 |

### 其他

| # | 文件 | 描述 |
|---|------|------|
| W-50 | `RecentEditList.tsx:19-34` | 注释声称"按时间排序"但实际未排序 |
| W-51 | `ConflictBadge.tsx:27` | 脆弱的正则替换 |
| W-52 | `GridCanvas.tsx:598-599` | Cell key 格式可能与 store 不匹配 |
| W-53 | `MapViewer.tsx:182` | `useWorldStore.getState()` 绕过 React 响应式 |
| W-54 | `DrawingToolbar.tsx:88` | Effect 依赖数组引用可能频繁触发 |

---

## 🎯 优先修复建议

### 第一优先级（影响核心功能 / 会崩溃）

| 编号 | 问题 | 影响 |
|------|------|------|
| BUG-01 | LifecycleBar Hooks 违规 | React 运行时崩溃 |
| BUG-02 | roundRect 兼容性 | Safari 直接崩溃 |
| BUG-04 | MapCanvas 点击未连接 | 地图标记放置完全失效 |
| BUG-03 | DPI 缩放缺失 | Retina 屏幕模糊 |
| BUG-27 | MarkerDetailDialog 文字不可读 | 深色背景深色字 |

### 第二优先级（数据正确性 / 逻辑错误）

| 编号 | 问题 | 影响 |
|------|------|------|
| BUG-05 | AiSettings disabled 永远 false | AI 设置逻辑错误 |
| BUG-06 | ChroniclePage 空引用 | 菜单操作崩溃 |
| BUG-07 | toLowerCase() 空值 | Faction 页面崩溃 |
| BUG-08 | 城市链接错指 | 仪表盘导航错误 |
| BUG-10 | 存储大小误判 | localStorage 可能溢出 |
| BUG-11 | 浅合并丢失数据 | 世界数据加载丢失字段 |
| BUG-16 | Math.min 与字符串比较 | 提示框定位失效 |

### 第三优先级（性能优化）

| 编号 | 建议 |
|------|------|
| O-02, O-03 | Zustand 选择器粒度优化，使用 `useShallow` 或返回原始值 |
| O-04, O-05 | CharacterPage 计算 memoize |
| O-06, O-07 | GridCanvas 分层渲染优化 |
| O-12 | WorldSeedWizard 内部组件提取到外部 |

---

*报告由 5 个并行审查代理生成，覆盖全部 87 个源文件。*
