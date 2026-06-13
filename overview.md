# RealmKit Character Card v2.0 — Phase 3-4 完成报告

## 本次完成

### Phase 3: 导出功能对齐
- **CharacterCardExporter.tsx** 全面重写，与屏幕卡片布局对齐：
  - 顶部色带：称号「」+ 势力名
  - 大尺寸立绘区（224px canvas）+ portrait 图片支持 + cover 裁剪 + 暗角晕染
  - 卡牌编号（左上角）+ 稀有度角标（右上角）
  - 勾玉体力行（Canvas 径向渐变绘制）
  - 技能完整描述（2行）
  - 底栏：势力·称号 | 稀有度·编号
  - 稀有度内框高亮（替换原金色内框）

### Phase 4: 稀有度体系
- **src/utils/rarity.ts** — 新建稀有度自动计算工具
  - `calcAutoRarity()`: 基于技能数/传记长度/事件关联自动判定
  - `calcRarityForCharacter()`: 从 Character 对象直接计算
  - `RARITY_LABEL` / `RARITY_ORDER` 常量导出
- **CharacterForm** 集成：稀有度 Select 下方显示「系统推荐」提示
- 规则: common(默认) → rare(技能≥4) → epic(技能≥5+传记≥100字) → legendary(技能≥6+传记≥200+事件≥5)

### CharacterCard.tsx 修复
- Z2 插画区：80px → 260px，支持 portrait 立绘 URL + avatar 回退
- Z6 勾玉体力：JadeTokens 组件正式渲染
- 稀有度角标 + 卡牌编号叠加在插画区

## 变更文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/components/character/CharacterCard.tsx` | 修改 | 插画区 260px + JadeTokens + rarity/cardNumber |
| `src/components/character/CharacterCardExporter.tsx` | 重写 | 全字段 Canvas 导出对齐 v2.0 |
| `src/utils/rarity.ts` | 新建 | 稀有度自动计算 + 推荐提示 |
| `src/components/character/CharacterForm.tsx` | 修改 | 稀有度推荐提示 |

## 构建状态
```
npx tsc --noEmit → 0 errors ✅
```
