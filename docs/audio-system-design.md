# 世界圣典 · 游戏音频系统设计文档

**音频设计师**: GameAudioEngineer  
**版本**: v1.0  
**日期**: 2026-05-18  
**项目**: zzworld_chronicle（世界圣典）  
**平台**: Web (Chrome / Safari) · Cloudflare Pages 静态部署  
**技术栈**: Web Audio API + React Hook + Zustand 状态驱动

---

## 一、声音身份定义

### 1.1 三个形容词

> **古朴 · 温暖 · 神秘**

这个世界的声音应该像一个12岁孩子翻开古老的羊皮卷——纸页的沙沙声、远处传来的风铃声、铜笔在纸上划过的触感。不要电子化，不要现代感。所有音色都指向"手工书写的史诗"。

### 1.2 声音调色板

| 维度 | 选择 | 理由 |
|------|------|------|
| 乐器偏好 | 古筝、笛、琵琶、西洋古典吉他、钢琴、大提琴 | 古典与架空融合，符合世界观 |
| 质感偏好 | 木质感、金属微振、纸张摩擦、羽毛笔触 | 与视觉叙事层（羊皮纸、烛光）呼应 |
| 空间偏好 | 轻微混响（教堂级 1.2s 尾音）、开阔户外感 | 12岁孩子的想象世界应该"听起来很大" |
| 节奏 | 中慢速为主（60-80 BPM），创作时稍快（90 BPM） | 不催促，给予思考和想象的留白 |

---

## 二、音频系统架构

### 2.1 为什么不用 FMOD/Wwise？

「世界圣典」是纯前端 Web 应用，部署为 Cloudflare Pages 静态站点。没有游戏引擎运行时，没有原生音频中间件支持。音频系统需要：

- 在浏览器 AudioContext 中运行
- 与 React 组件生命周期绑定
- 通过 Zustand Store 状态驱动
- 零安装依赖，纯 JavaScript 实现

**结论**：使用 Web Audio API 自建轻量级音频管理器，以 React Hook 形式接入组件树。

### 2.2 Audio Bus 架构

```
                        ┌──────────────┐
                        │  Master Bus  │ ← 全局音量 / 静音
                        │  (GainNode)  │
                        └──────┬───────┘
               ┌───────────────┼───────────────┐
               │               │               │
        ┌──────┴──────┐ ┌─────┴─────┐ ┌───────┴───────┐
        │   SFX Bus   │ │ Music Bus │ │ Ambience Bus  │
        │  (GainNode) │ │(GainNode) │ │  (GainNode)   │
        └──────┬──────┘ └─────┬─────┘ └───────┬───────┘
               │               │               │
        ┌──────┴──────┐        │        ┌──────┴──────┐
        │  UI SFX Bus │        │        │ Env SFX Bus │
        │  (GainNode) │        │        │  (GainNode) │
        └─────────────┘        │        └─────────────┘
                        ┌──────┴──────┐
                        │ Music Conv  │ ← ConvolverNode 混响
                        │ (Reverb)    │
                        └─────────────┘
```

每个 Bus 是独立的 GainNode，支持：
- 独立音量控制（SFX / 音乐 / 环境）
- 独立静音开关
- Master Bus 作为最终输出

### 2.3 核心模块

| 模块 | 职责 | 文件 |
|------|------|------|
| `AudioManager` | AudioContext 单例、Bus 管理、资源加载/卸载 | `src/services/audio/AudioManager.ts` |
| `SFXPlayer` | One-shot 音效播放，支持随机容器（音高/音量变化） | `src/services/audio/SFXPlayer.ts` |
| `MusicSystem` | 自适应音乐状态机，crossfade 过渡 | `src/services/audio/MusicSystem.ts` |
| `AmbienceSystem` | 环境声循环播放，按场景切换 | `src/services/audio/AmbienceSystem.ts` |
| `useAudio` | React Hook，连接 Zustand 状态到音频参数 | `src/hooks/useAudio.ts` |
| `AudioSettings` | 用户偏好设置（音量/静音），持久化到 localStorage | `src/store/audioStore.ts` |

---

## 三、交互音效清单 (SFX)

### 3.1 UI 音效（优先级 0 — 最高）

| 事件 ID | 触发时机 | 声音描述 | 持续时间 | 格式 |
|---------|---------|---------|---------|------|
| `ui/click` | 所有按钮点击 | 清脆的木质敲击，带轻微共鸣 | 80ms | MP3 |
| `ui/hover` | 按钮/卡片悬停 | 极轻的羽毛拂过声 | 50ms | MP3 |
| `ui/drawer_open` | 抽屉/侧面板展开 | 羊皮纸展开的沙沙声 | 300ms | MP3 |
| `ui/drawer_close` | 抽屉/侧面板关闭 | 卷轴收合声 | 250ms | MP3 |
| `ui/dialog_open` | 确认弹窗出现 | 沉重的古书翻页声 | 400ms | MP3 |
| `ui/dialog_close` | 弹窗关闭 | 轻柔的书页合拢 | 200ms | MP3 |
| `ui/tab_switch` | 侧边栏导航切换 | 铜铃轻敲 | 120ms | MP3 |
| `ui/success` | 操作成功（保存/创建） | 水晶叮响 + 轻柔回响 | 600ms | MP3 |
| `ui/delete` | 删除操作 | 短促的消散声（纸灰飘散） | 400ms | MP3 |
| `ui/error` | 操作失败/冲突检测 | 低沉的鼓点警示 | 500ms | MP3 |
| `ui/search_type` | 搜索框输入字符 | 墨水滴落 | 40ms | MP3 |
| `ui/search_result` | 搜索结果出现 | 金属微振的"叮"声 | 150ms | MP3 |

**随机容器配置**：每个 UI 音效提供 3 个变体，播放时随机选择并叠加 ±5% 音高偏移、±10% 音量偏移，避免机械重复感。

### 3.2 交互音效（优先级 1）

| 事件 ID | 触发时机 | 声音描述 | 持续时间 |
|---------|---------|---------|---------|
| `sfx/card_flip` | 人物卡片翻转/展开 | 卡牌翻转声 + 木质桌面撞击 | 300ms |
| `sfx/card_place` | 卡片放回/选中 | 轻柔落牌声 | 150ms |
| `sfx/pin_drop` | 地图上放置图钉 | 金属针刺入软木板 | 200ms |
| `sfx/pin_hover` | 图钉悬停 | 微弱的金属共鸣 | 100ms |
| `sfx/paint_start` | 地图画笔按下 | 毛笔蘸墨声 | 150ms |
| `sfx/paint_stroke` | 画笔拖动（节流 200ms） | 墨迹流淌声 | 100ms |
| `sfx/timeline_scroll` | 时间轴滚动（节流 300ms） | 纸卷滑动声 | 200ms |
| `sfx/event_create` | 新增事件节点 | 铜笔落纸声 + 墨迹扩散 | 350ms |
| `sfx/event_conflict` | 冲突检测触发 | 不和谐的弦颤音 | 800ms |
| `sfx/graph_node_select` | 关系图节点选中 | 风铃轻响 | 200ms |
| `sfx/graph_link` | 关系连线高亮 | 丝线拨动声 | 250ms |
| `sfx/chronicle_scroll` | 编年史滚动阅读 | 书页翻动声 | 300ms |
| `sfx/faction_color` | 势力色带出现 | 旗帜飘扬声 | 400ms |
| `sfx/import` | 数据导入完成 | 古卷展开 + 封印碎裂 | 800ms |
| `sfx/export` | 数据导出完成 | 卷轴收卷 + 封印加封 | 600ms |

### 3.3 Voice 规则

| 规则 | 配置 |
|------|------|
| 最大同时播放 | 8 voices |
| 优先级抢占 | 低优先级（环境）被高优先级（UI）抢占 |
| 同事件防重复 | 同一事件 ID 在 100ms 内不重复触发 |
| 音高随机 | ±5% (UI) / ±8% (交互) |
| 音量随机 | ±10% |

---

## 四、自适应音乐系统

### 4.1 音乐状态定义

| 状态 | 场景 | 乐器编制 | BPM | 情绪 |
|------|------|---------|-----|------|
| `silence` | 首次进入 / 用户关闭音乐 | 无 | - | - |
| `explore` | 地图页 / 关系图页 / 仪表盘 | 钢琴 + 大提琴长音 | 60 | 宁静、开阔 |
| `create` | 编辑人物 / 新增事件 / 绘制地图 | 古典吉他 + 竹笛 + 轻打击 | 75 | 温暖、专注 |
| `epic` | 编年史阅读页 / 事件密集区 | 管弦乐 + 合唱 + 定音鼓 | 80 | 宏大、史诗 |
| `conflict` | 冲突检测触发 | 紧张弦乐颤音 + 低音鼓点 | 90 | 紧张、警示 |

### 4.2 状态转换规则

| 从 → 到 | 触发条件 | 过渡方式 | 过渡时间 |
|---------|---------|---------|---------|
| silence → explore | 进入地图/关系图/仪表盘 | Fade In | 2s |
| silence → create | 打开编辑表单 | Fade In | 1.5s |
| explore → create | 打开编辑表单 | Crossfade | 1.5s |
| create → explore | 关闭编辑表单 | Crossfade | 1.5s |
| explore → epic | 进入编年史页 / 事件密度 > 阈值 | Crossfade | 2s |
| epic → explore | 离开编年史 / 事件密度下降 | Crossfade | 2s |
| * → conflict | 冲突检测触发（conflicts.length > 0） | Stinger 叠加 | 0.5s |
| conflict → explore | 冲突全部解除，延迟 3s 后 | Crossfade | 1.5s |
| create → conflict | 编辑时触发冲突 | Stinger 叠加 + 低频增加 | 0.3s |
| * → silence | 用户关闭音乐 | Fade Out | 1s |

### 4.3 参数驱动

音乐状态由 Zustand Store 的数据自动计算，不手动设置：

| 参数 | 来源 | 计算方式 | 更新频率 |
|------|------|---------|---------|
| `currentPage` | React Router `useLocation()` | 直接读取 pathname | 路由变化时 |
| `isEditing` | 表单开关状态 | 编辑抽屉/表单是否打开 | 交互时 |
| `conflictLevel` | `worldStore.conflicts.length` | 0=无, 1-2=低, 3+=高 | 每次 persist 后 |
| `eventDensity` | 当前时间轴视窗内事件数 | `events.filter(e => yearRange).length` | 时间轴滚动时 |
| `factionCount` | `worldStore.data.factions.length` | 直接读取 | 数据变化时 |

### 4.4 音乐资源规格

| 属性 | 规格 |
|------|------|
| 格式 | WebM (Opus 编码) 为主，MP3 为 fallback |
| 采样率 | 44100 Hz |
| 声道 | 立体声 |
| 比特率 | 128 kbps |
| 循环 | 无缝循环（fade out 尾部对齐 fade in 头部） |
| 单曲时长 | 60-90 秒循环段 |
| 总数 | 5 首（对应 5 个状态） |
| 总大小 | ≤ 6MB（Opus 压缩后约 1MB/分钟） |

---

## 五、环境声场系统

### 5.1 环境声映射

| 页面/场景 | 环境声 | 循环方式 | 音量 |
|-----------|-------|---------|------|
| 仪表盘 | 微风拂过树叶 + 远处鸟鸣 | 无缝循环 | 20% |
| 地图页（户外） | 风声 + 草地虫鸣 | 无缝循环 | 25% |
| 地图页（雪地格子多） | 寒风呼啸 + 冰雪碎裂（轻） | 无缝循环 | 20% |
| 地图页（沙漠格子多） | 干燥风沙声 | 无缝循环 | 20% |
| 人物卡片区 | 室内：木地板脚步 + 翻书声 | 无缝循环 | 15% |
| 时间轴 | 烛火噼啪 + 羊皮纸翻页 | 无缝循环 | 15% |
| 关系图 | 墨水流动 + 纸上书写 | 无缝循环 | 15% |
| 编年史 | 大厅回响 + 火炉燃烧 | 无缝循环 | 20% |
| 编辑表单（覆盖层） | 浅层 ambient 降低 50% | 音量渐变 | 8% |

### 5.2 地形声场联动

基于 `MapGrid.cells` 中 `terrain` 图层的数据分析，动态调整环境声：

```
地形格子分布 → 环境声混合比例
  forest 格子占比高  → 鸟鸣 + 树叶沙沙 ↑
  deepOcean 占比高   → 海浪声 ↑
  mountain 占比高    → 山风呼啸 ↑
  desert 占比高      → 干燥风沙 ↑
  snowPeak 占比高    → 寒风 + 冰裂 ↑
  grassland 占比高   → 草地虫鸣 + 微风 ↑
```

计算方式：每 5 秒采样一次当前视窗内的地形格子类型分布，按比例混合最多 3 种环境声。

### 5.3 环境声资源规格

| 属性 | 规格 |
|------|------|
| 格式 | WebM (Opus) |
| 单条时长 | 30-60 秒无缝循环 |
| 总数 | 约 10 条 |
| 总大小 | ≤ 3MB |

---

## 六、音频性能预算

### 6.1 资源预算

| 类别 | 格式 | 加载策略 | 内存预算 |
|------|------|---------|---------|
| UI SFX (12 × 3 变体 = 36 个) | MP3 | 应用启动时预加载到 AudioBuffer | ≤ 500KB |
| 交互 SFX (15 个) | MP3 | 按页面懒加载 | ≤ 300KB |
| 音乐 (5 首) | WebM/Opus | 流式播放（不预加载完整文件） | ≤ 1MB 缓冲 |
| 环境声 (10 条) | WebM/Opus | 按需加载，离开页面释放 | ≤ 1.5MB |
| **总计** | | | **≤ 3.3MB 内存** |

### 6.2 运行时预算

| 指标 | 限制 | 说明 |
|------|------|------|
| 同时播放 Voice 数 | ≤ 8 | 超出则抢占低优先级 |
| AudioContext DSP 时间 | ≤ 2ms/帧 | 在 requestAnimationFrame 中测量 |
| 内存峰值 | ≤ 5MB | 包含所有解码后的 AudioBuffer |
| 首次音频可交互时间 | ≤ 1s | 预加载 UI SFX 完成后 |
| 音乐 crossfade CPU | ≤ 0.5ms | 两个 GainNode 线性渐变 |

### 6.3 兼容性

| 浏览器 | AudioContext | Opus/WebM | MP3 | 备注 |
|--------|-------------|-----------|-----|------|
| Chrome 80+ | ✅ | ✅ | ✅ | 主要目标 |
| Safari 14+ | ✅ | ❌ (需 MP3 fallback) | ✅ | 需要 MP3 音乐备选 |
| Firefox 80+ | ✅ | ✅ | ✅ | 完全支持 |
| Mobile Safari | ✅ | ❌ | ✅ | 需用户手势激活 AudioContext |

**关键**：Safari 不支持 Opus/WebM 容器，音乐需要同时提供 MP3 格式。使用 `<audio>` 元素的 `canPlayType()` 检测并选择格式。

---

## 七、React 集成方案

### 7.1 音频 Store (audioStore.ts)

```typescript
import { create } from 'zustand';

interface AudioSettings {
  masterVolume: number;    // 0-1
  sfxVolume: number;       // 0-1
  musicVolume: number;     // 0-1
  ambienceVolume: number;  // 0-1
  isMuted: boolean;
  musicEnabled: boolean;
  ambienceEnabled: boolean;
}

interface AudioStore extends AudioSettings {
  setMasterVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setAmbienceVolume: (v: number) => void;
  toggleMute: () => void;
  toggleMusic: () => void;
  toggleAmbience: () => void;
}
```

持久化到 `localStorage` key: `zzworld_audio_settings`。

### 7.2 useAudio Hook

```typescript
import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorldStore } from '../store/worldStore';
import { audioManager } from '../services/audio/AudioManager';

/**
 * 全局音频 Hook — 在 AppShell 层级使用一次
 * 监听路由变化 → 切换音乐状态
 * 监听冲突数据 → 触发冲突音效
 * 监听页面交互 → 播放对应 SFX
 */
export function useAudio() {
  const location = useLocation();
  const conflicts = useWorldStore((s) => s.conflicts);
  const factions = useWorldStore((s) => s.data.factions);

  // 路由变化 → 切换音乐和环境声
  useEffect(() => {
    const path = location.pathname;
    if (path === '/map') {
      audioManager.setMusicState('explore');
      audioManager.setAmbienceScene('map');
    } else if (path === '/characters') {
      audioManager.setMusicState('explore');
      audioManager.setAmbienceScene('library');
    } else if (path === '/timeline') {
      audioManager.setMusicState('explore');
      audioManager.setAmbienceScene('candle');
    } else if (path === '/chronicle') {
      audioManager.setMusicState('epic');
      audioManager.setAmbienceScene('hall');
    } else if (path === '/graph') {
      audioManager.setMusicState('explore');
      audioManager.setAmbienceScene('writing');
    } else {
      audioManager.setMusicState('explore');
      audioManager.setAmbienceScene('ambient');
    }
  }, [location.pathname]);

  // 冲突变化 → 触发冲突音效层
  useEffect(() => {
    if (conflicts.length > 0) {
      audioManager.triggerConflict();
    } else {
      audioManager.clearConflict();
    }
  }, [conflicts.length]);
}
```

### 7.3 useSFX Hook（组件级）

```typescript
/**
 * 组件级 SFX 触发器
 * 用法: const sfx = useSFX(); sfx.play('ui/click');
 */
export function useSFX() {
  const play = useCallback((eventId: string) => {
    audioManager.playSFX(eventId);
  }, []);

  return { play };
}

// 在组件中使用:
// const sfx = useSFX();
// <Button onClick={() => sfx.play('ui/click')}>保存</Button>
```

### 7.4 集成点

| 组件 | 音频行为 | 事件 ID |
|------|---------|---------|
| `Sidebar.tsx` | 导航切换 | `ui/tab_switch` |
| `CharacterCard.tsx` | 翻转动画 | `sfx/card_flip` |
| `CharacterDrawer.tsx` | 展开/关闭 | `ui/drawer_open` / `ui/drawer_close` |
| `CharacterForm.tsx` | 保存成功 | `ui/success` |
| `MapCanvas.tsx` | 图钉放置 | `sfx/pin_drop` |
| `MapCanvas.tsx` (绘制) | 画笔拖动 | `sfx/paint_stroke` |
| `TimelineCanvas.tsx` | 事件创建 | `sfx/event_create` |
| `TimelineCanvas.tsx` | 滚动 | `sfx/timeline_scroll` |
| `RelationGraph.tsx` | 节点选中 | `sfx/graph_node_select` |
| `ChronicleReader.tsx` | 滚动阅读 | `sfx/chronicle_scroll` |
| `ConfirmDialog.tsx` | 打开/关闭 | `ui/dialog_open` / `ui/dialog_close` |
| `ConflictBadge.tsx` | 出现 | `sfx/event_conflict` |
| `SearchBar.tsx` | 输入/结果 | `ui/search_type` / `ui/search_result` |

---

## 八、音频资源文件结构

```
public/
  audio/
    sfx/
      ui/
        click_01.mp3, click_02.mp3, click_03.mp3
        hover_01.mp3, hover_02.mp3, hover_03.mp3
        drawer_open.mp3, drawer_close.mp3
        dialog_open.mp3, dialog_close.mp3
        tab_switch.mp3
        success.mp3
        delete.mp3
        error.mp3
        search_type.mp3, search_result.mp3
      interaction/
        card_flip.mp3, card_place.mp3
        pin_drop.mp3, pin_hover.mp3
        paint_start.mp3, paint_stroke.mp3
        timeline_scroll.mp3
        event_create.mp3, event_conflict.mp3
        graph_node_select.mp3, graph_link.mp3
        chronicle_scroll.mp3
        faction_color.mp3
        import.mp3, export.mp3
    music/
      explore.webm, explore.mp3
      create.webm, create.mp3
      epic.webm, epic.mp3
      conflict.webm, conflict.mp3
      conflict_stinger.mp3          // 短促警示音
    ambience/
      wind_leaves.webm              // 微风+树叶
      wind_cold.webm                // 寒风
      birds.webm                    // 鸟鸣
      sea_waves.webm                // 海浪
      desert_wind.webm              // 沙漠风沙
      fire_candle.webm              // 烛火
      fire_hearth.webm              // 壁炉
      library.webm                  // 图书馆翻书
      writing.webm                  // 书写
      hall_echo.webm                // 大厅回响
```

**总文件数**: 约 60 个  
**总磁盘占用**: ≤ 10MB (压缩后)

---

## 九、实施优先级

### Phase 1 — 音频基础架构（1-2 天）

1. 实现 `AudioManager` 单例（AudioContext + Bus 架构）
2. 实现 `SFXPlayer`（one-shot 播放 + 随机容器）
3. 实现 `audioStore`（音量/静音设置 + localStorage 持久化）
4. 实现 `useAudio` 和 `useSFX` Hook
5. 集成到 `AppShell.tsx`

### Phase 2 — UI 音效集成（1 天）

1. 制作或采购 12 个 UI 音效（每个 3 变体）
2. 在所有按钮、弹窗、抽屉组件中接入
3. 用户设置面板（音量滑块 + 静音开关）

### Phase 3 — 交互音效（1 天）

1. 制作 15 个交互音效
2. 逐组件接入 SFX 触发

### Phase 4 — 自适应音乐（2-3 天）

1. 实现 `MusicSystem`（状态机 + crossfade）
2. 制作/采购 4 首循环音乐 + 1 个冲突 stinger
3. 路由联动 + 冲突联动
4. Safari MP3 fallback 检测

### Phase 5 — 环境声场（1-2 天）

1. 实现 `AmbienceSystem`
2. 制作/采购 10 条环境声
3. 地形格子分析 → 环境声混合
4. 按页面切换环境声

---

## 十、技术注意事项

### 10.1 AudioContext 用户手势要求

浏览器要求 AudioContext 必须在用户手势（click/touch）后才能 resume。策略：
- 首次用户交互时调用 `audioContext.resume()`
- 在此之前所有 SFX 静默排队，resume 后不回放

### 10.2 移动端 Safari 限制

- 同时播放 voice 数限制更严格（建议 ≤ 4）
- Web Audio API 的 BufferSource 在后台会被暂停
- 需要处理 `visibilitychange` 事件：页面隐藏时暂停所有音频

### 10.3 格式检测

```typescript
function getSupportedFormat(): 'webm' | 'mp3' {
  const audio = new Audio();
  if (audio.canPlayType('audio/webm; codecs=opus') !== '') {
    return 'webm';
  }
  return 'mp3';
}
```

### 10.4 reduced-motion 尊重

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// 如果用户偏好 reduced motion，降低环境声和音乐音量 50%，减少 SFX 触发频率
```

---

## 十一、音效素材来源建议

| 来源 | 类型 | 价格 | 备注 |
|------|------|------|------|
| freesound.org | 免费 SFX | 免费 | 需筛选质量，注意授权协议 |
| Sonniss GDC | 高品质 SFX 包 | 免费（年度发放） | 游戏音效行业标准 |
| Epidemic Sound | 音乐 + SFX | 订阅制 | 适合获取背景音乐 |
| 自己录制 | 纸张、木材、金属声 | 成本低 | 最贴合项目风格 |
| AI 生成 (Suno/Udio) | 背景音乐 | 低成本 | 快速原型，后续替换为手工制作 |

---

*本文档基于项目 PRD 和架构文档编写，将随实现进展持续更新。*
