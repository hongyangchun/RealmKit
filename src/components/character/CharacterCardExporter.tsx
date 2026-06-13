/**
 * CharacterCardExporter - 三国杀风格卡片导出器 (v4.0)
 * 与 CharacterCard.tsx 预览 逐项像素对齐
 *
 * 对比维度（均为 2x Retina 缩放）：
 * - 字体族：LXGW WenKai TC (与预览一致)
 * - 字体大小：rem × 16 × 2 精确计算
 * - 配色：完全复用预览色板
 * - 布局：12 区对齐（称号/插画/勾玉/技能/底栏）
 * - 渐变：135deg 对角渐变
 * - 纹理：repeating-linear-gradient 斜纹叠加
 */
import React, { useCallback, useRef, useState } from 'react';
import { IconButton, Tooltip, Snackbar, Alert } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import type { Character, Faction, CardRarity } from '../../types';

// ══════════════════════════════════════════════════
// 常量（2x Retina 精度：预览 rem×16×2）
// ══════════════════════════════════════════════════
const W = 660;                // 卡片宽度
const PAD = 24;              // 内容水平边距 (preview px:1.5=12px ×2)
const CW = W - PAD * 2;      // 内容区宽度 = 612
const BASE_H = 924;          // 5:7 基准高度 (660*7/5)

// ── 预览色板（与 CharacterCard.tsx 严格一致）──
const CARD_BG     = '#1a100a';
const GOLD        = '#c9a050';
const TEXT_GOLD   = '#f5e6c0';   // 姓名/标题色
// 势力原色直接用 faction.color，不再 hardcode

// ── 字体族（与预览 CharacterCard.tsx 一致）──
const FONT_FAMILY = '"LXGW WenKai TC","Noto Serif SC",serif';
const FONT_SANS   = 'sans-serif';  // Chip 类型标签用 sans-serif

const RARITY_CN: Record<CardRarity, { label: string; border: string; bg: string; text: string }> = {
  common:    { label: '普通', border: '#666',     bg: '#2a2a2a', text: '#999' },
  rare:      { label: '稀有', border: '#4a9eff', bg: '#1a3a5c', text: '#4a9eff' },
  epic:      { label: '史诗', border: '#9a4aff', bg: '#3a1a5c', text: '#9a4aff' },
  legendary: { label: '传说', border: '#ff9a4a', bg: '#5c3a1a', text: '#ff9a4a' },
};

// ══════════════════════════════════════════════════
// 工具函数
// ══════════════════════════════════════════════════

/** 圆角矩形路径 */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

function strokeRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string, lw: number) {
  rr(ctx, x, y, w, h, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** 颜色加深（与预览 adjustColorDark 一致）*/
function darken(hex: string, ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * (1 - ratio));
  const dg = Math.round(g * (1 - ratio));
  const db = Math.round(b * (1 - ratio));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

/** 文字换行，返回总高度 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  maxW: number, lh: number, maxLines = 99,
): number {
  const chars = [...text];
  const lines: string[] = [];
  let cur = '';
  for (const ch of chars) {
    if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; }
    else { cur += ch; }
  }
  if (cur) lines.push(cur);
  const show = lines.slice(0, maxLines);
  show.forEach((l, i) => {
    const t = i === maxLines - 1 && lines.length > maxLines ? l.slice(0, -1) + '\u2026' : l;
    ctx.fillText(t, x, y + i * lh);
  });
  return show.length * lh;
}

/** 加载图片 */
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// ══════════════════════════════════════════════════
// 动态高度计算
// ══════════════════════════════════════════════════
let H_CARD = BASE_H;

function calcHeight(ch: Character): number {
  let h = BASE_H;
  // 计算技能区超出部分
  let skillH = 0;
  for (const skill of ch.skills) {
    skillH += 44;  // name row
    if (skill.description?.trim()) {
      const lines = Math.ceil(skill.description.length / 40);
      skillH += 26 * lines + 8;
    }
    skillH += 18; // gap (mb:1=8px*2=16 → ~18 for safety)
  }
  skillH += 16; // pt:1 top padding
  // 特质区
  let traitH = 0;
  if (ch.traits.length > 0) traitH = 64; // row + margin
  const extra = skillH + traitH - 420; // 基准可用空间
  if (extra > 0) h += extra;
  return h;
}

// ══════════════════════════════════════════════════
// 主绘制函数
// ══════════════════════════════════════════════════

async function drawCard(
  ctx: CanvasRenderingContext2D,
  ch: Character,
  faction: Faction | undefined,
) {
  const fc = faction?.color ?? '#8B4513';
  const fn = faction?.name ?? '无势力';
  const rarity = RARITY_CN[ch.rarity ?? 'common'];
  const hp = Math.min(ch.hp ?? 4, 8);

  H_CARD = calcHeight(ch);

  // ── 1. 卡片底色 ──
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, 0, W, H_CARD);

  // ── 2. 斜纹纹理叠加（匹配 preview: repeating-linear-gradient(-55deg, ...)）──
  try {
    const pc = document.createElement('canvas');
    pc.width = 72; pc.height = 72;
    const pctx = pc.getContext('2d')!;
    pctx.strokeStyle = 'rgba(255,255,255,0.012)';
    pctx.lineWidth = 2;
    pctx.beginPath();
    // 四条 45° 斜线覆盖一个 tile
    pctx.moveTo(0, 18); pctx.lineTo(18, 0);
    pctx.moveTo(0, 54); pctx.lineTo(54, 0);
    pctx.moveTo(18, 72); pctx.lineTo(72, 18);
    pctx.moveTo(54, 72); pctx.lineTo(72, 54);
    pctx.stroke();
    const pattern = ctx.createPattern(pc, 'repeat');
    if (pattern) {
      ctx.save();
      // 旋转 -55deg 模拟
      ctx.translate(W / 2, H_CARD / 2);
      ctx.rotate((-55 * Math.PI) / 180);
      ctx.fillStyle = pattern;
      ctx.fillRect(-W, -H_CARD, W * 2, H_CARD * 2);
      ctx.restore();
    }
  } catch { /* noop */ }

  // ── 3. 外边框（势力色，匹配 preview border: 2px solid factionColor cc）──
  strokeRR(ctx, 2, 2, W - 4, H_CARD - 4, 16, fc, 4);
  // 叠加金边透明度效果 (preview: borderColor: selected ? ... : `${factionColor}cc`)
  if (fc !== '#8B4513') {
    // 势力色已在 opacity cc 级别，canvas stroke 不给 alpha，所以再加一层半透覆盖
    // 这里直接使用势力色即可（canvas 不支持 8-digit hex 简便写法，但支持 rgba）
  }

  // ── 4. 顶部内高光（匹配 preview: inset 0 1px 0 rgba(255,255,255,0.04)）──
  const hlGrad = ctx.createLinearGradient(0, 4, 0, 20);
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
  hlGrad.addColorStop(1, 'transparent');
  ctx.save();
  rr(ctx, 4, 4, W - 8, 20, 12);
  ctx.clip();
  ctx.fillStyle = hlGrad;
  ctx.fillRect(4, 4, W - 8, 16);
  ctx.restore();

  // ── 5. 四角 L 纹 ──
  {
    const size = 28, thick = 3, off = 12;  // preview: 14, 1.5, 5 ×2
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = thick;
    ctx.lineCap = 'butt';  // 匹配 preview 默认平头
    const dl = [
      [off, off + size, off, off, off + size, off],                         // TL
      [W - off, off + size, W - off, off, W - off - size, off],              // TR
      [off, H_CARD - off - size, off, H_CARD - off, off + size, H_CARD - off], // BL
      [W - off, H_CARD - off - size, W - off, H_CARD - off, W - off - size, H_CARD - off], // BR
    ];
    for (const [x1, y1, x2, y2, x3, y3] of dl) {
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ═══════════════════════════════════════════
  // Z1-Z2: 称号 + 姓名行
  // ═══════════════════════════════════════════
  const HEAD_Y = 10;
  const HEAD_H = 100; // preview: py:0.7(5.6px) + content ~fontSizes

  // 135deg 对角渐变（匹配 preview: linear-gradient(135deg, darken(0.15)→darken(0.4))）
  const hGrad = ctx.createLinearGradient(PAD, HEAD_Y, W - PAD, HEAD_Y + HEAD_H);
  hGrad.addColorStop(0, darken(fc, 0.15));
  hGrad.addColorStop(1, darken(fc, 0.40));
  ctx.save();
  rr(ctx, PAD, HEAD_Y, CW, HEAD_H, 12);
  ctx.clip();
  ctx.fillStyle = hGrad;
  ctx.fillRect(PAD, HEAD_Y, CW, HEAD_H);
  ctx.restore();

  // 头部分隔线（preview: borderBottom 1px GOLD60）
  ctx.save();
  ctx.strokeStyle = `${GOLD}60`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, HEAD_Y + HEAD_H);
  ctx.lineTo(W - PAD, HEAD_Y + HEAD_H);
  ctx.stroke();
  ctx.restore();

  // 称号「xxx」（preview: 0.7rem→11.2px, GOLDcc, center, letterSpacing 0.1em）
  let curY = HEAD_Y + 22;
  if (ch.nickname) {
    ctx.save();
    ctx.font = `22px ${FONT_FAMILY}`;  // 0.7rem×16×2=22.4→22
    ctx.fillStyle = `${GOLD}cc`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // letterSpacing 模拟：一次绘制一个字符（带间距）
    const nick = `「${ch.nickname}」`;
    const nickArr = [...nick];
    const nickSpacing = 2.2; // 0.1em @ 22px = 2.2px
    let nx = W / 2 - (nickArr.length * (11 + nickSpacing) - nickSpacing) / 2;
    for (const c of nickArr) {
      ctx.fillText(c, nx + 11, curY);  // half char width center
      nx += ctx.measureText(c).width + nickSpacing;
    }
    ctx.restore();
    curY += 28;
  }

  // 姓名（preview: 1.3rem→20.8px, bold, #f5e6c0, letterSpacing 0.08em, textShadow）
  ctx.save();
  ctx.font = `bold 42px ${FONT_FAMILY}`;  // 1.3rem×16×2=41.6→42
  ctx.fillStyle = TEXT_GOLD;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  // letterSpacing 模拟
  const nameChars = [...ch.name];
  const nameSpacing = 3.4; // 0.08em @ 42px = 3.36px
  let nnx = W / 2 - (nameChars.length * (21 + nameSpacing) - nameSpacing) / 2;
  for (const c of nameChars) {
    ctx.fillText(c, nnx + 21, curY + 6);
    nnx += ctx.measureText(c).width + nameSpacing;
  }
  ctx.restore();
  curY += 46;

  // 头衔（preview: 0.65rem→10.4px, GOLD99, center）
  if (ch.title) {
    ctx.save();
    ctx.font = `21px ${FONT_FAMILY}`;  // 0.65rem×16×2=20.8→21
    ctx.fillStyle = `${GOLD}99`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(ch.title, W / 2, curY);
    ctx.restore();
  }

  // ═══════════════════════════════════════════
  // Z3-Z5: 插画区（preview: height 160px）
  // ═══════════════════════════════════════════
  const PORT_TOP = HEAD_Y + HEAD_H + 8;
  const PORT_H = 320;  // 160×2

  // 背景
  fillRR(ctx, PAD, PORT_TOP, CW, PORT_H, 12, darken(fc, 0.35));

  // 加载立绘
  let portraitImg: HTMLImageElement | null = null;
  if (ch.portrait) {
    try { portraitImg = await loadImg(ch.portrait); } catch { /* fallback */ }
  }
  if (!portraitImg && ch.avatar) {
    try { portraitImg = await loadImg(ch.avatar); } catch { /* fallback */ }
  }

  if (portraitImg) {
    ctx.save();
    rr(ctx, PAD, PORT_TOP, CW, PORT_H, 12);
    ctx.clip();
    const imgRatio = portraitImg.width / portraitImg.height;
    const areaRatio = CW / PORT_H;
    let sw: number, sh: number, sx: number, sy: number;
    if (imgRatio > areaRatio) {
      sh = portraitImg.height;
      sw = sh * areaRatio;
      sx = (portraitImg.width - sw) / 2;
      sy = 0;
    } else {
      sw = portraitImg.width;
      sh = sw / areaRatio;
      sx = 0;
      sy = (portraitImg.height - sh) / 2;
    }
    ctx.drawImage(portraitImg, sx, sy, sw, sh, PAD, PORT_TOP, CW, PORT_H);
    ctx.restore();
  } else {
    // Fallback: 圆角方框头像（匹配 preview Avatar: 100×100→200×200, border GOLD80, shadow）
    const aboxW = 200, aboxH = 200;
    const aboxX = W / 2 - aboxW / 2;
    const aboxY = PORT_TOP + PORT_H / 2 - aboxH / 2;
    fillRR(ctx, aboxX, aboxY, aboxW, aboxH, 8, darken(fc, 0.5));
    strokeRR(ctx, aboxX, aboxY, aboxW, aboxH, 8, `${GOLD}80`, 4);
    // 阴影
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 0;
    fillRR(ctx, aboxX, aboxY, aboxW, aboxH, 8, 'transparent');
    strokeRR(ctx, aboxX, aboxY, aboxW, aboxH, 8, `${GOLD}80`, 4);
    ctx.restore();
    // 大字
    ctx.save();
    ctx.font = `bold 100px ${FONT_FAMILY}`;
    ctx.fillStyle = TEXT_GOLD;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch.name.charAt(0), W / 2, PORT_TOP + PORT_H / 2);
    ctx.restore();
  }

  // 边缘暗角（匹配 preview: radial-gradient(ellipse at center, transparent 30%, #1a100acc 100%)）
  {
    const vignette = ctx.createRadialGradient(W / 2, PORT_TOP + PORT_H / 2, CW * 0.15, W / 2, PORT_TOP + PORT_H / 2, CW * 0.7);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(26,16,10,0.8)');
    ctx.save();
    rr(ctx, PAD, PORT_TOP, CW, PORT_H, 12);
    ctx.clip();
    ctx.fillStyle = vignette;
    ctx.fillRect(PAD, PORT_TOP, CW, PORT_H);
    ctx.restore();
  }

  // 插画区分隔线（preview: borderBottom 1px GOLD40）
  ctx.save();
  ctx.strokeStyle = `${GOLD}40`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, PORT_TOP + PORT_H);
  ctx.lineTo(W - PAD, PORT_TOP + PORT_H);
  ctx.stroke();
  ctx.restore();

  // 卡牌编号（preview: top:8→16, left:8→16, 0.6rem→19px, GOLD99, bg rgba(0,0,0,0.5)）
  if (ch.cardNumber) {
    ctx.save();
    ctx.font = `19px ${FONT_FAMILY}`;
    const labelW = ctx.measureText(ch.cardNumber).width + 20;
    fillRR(ctx, PAD + 16, PORT_TOP + 16, labelW, 28, 4, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = `${GOLD}99`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch.cardNumber, PAD + 16 + labelW / 2, PORT_TOP + 30);
    ctx.restore();
  }

  // 稀有度角标（preview: top:8→16, right:8→16, 0.6rem→19px）
  {
    ctx.save();
    ctx.font = `19px ${FONT_FAMILY}`;
    const rlw = ctx.measureText(rarity.label).width + 26;
    fillRR(ctx, W - PAD - 16 - rlw, PORT_TOP + 16, rlw, 28, 4, rarity.bg);
    strokeRR(ctx, W - PAD - 16 - rlw, PORT_TOP + 16, rlw, 28, 4, rarity.border, 2);
    ctx.fillStyle = rarity.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rarity.label, W - PAD - 16 - rlw / 2, PORT_TOP + 30);
    ctx.restore();
  }

  // ═══════════════════════════════════════════
  // Z6: 勾玉体力行（preview: px:1.5→24, py:0.6→10, borderBottom GOLD25）
  // ═══════════════════════════════════════════
  let curY2 = PORT_TOP + PORT_H + 14;
  const HP_ROW_H = 60;

  // "体力" 标签（preview: 0.65rem→21px, GOLDaa, mr:1）
  ctx.save();
  ctx.font = `21px ${FONT_FAMILY}`;
  ctx.fillStyle = `${GOLD}aa`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('体力', PAD + 30, curY2 + HP_ROW_H / 2);
  const labelW = ctx.measureText('体力').width + 16; // mr:1=8px×2=16
  ctx.restore();

  // 勾玉（匹配 JadeTokens.tsx: size 22→44, 颜色 #DAA520/#8B6914）
  {
    const jr = 22;           // size 22×2/2
    const jg = 8;            // gap 0.5×16÷2? preview gap:0.5=4px, ×2=8
    const jadeColor = '#DAA520';     // 预览默认色
    const jadeBorder = '#8B6914';    // 预览边框色
    const jadeInner = '#8B6914';     // 预览内点色

    for (let i = 0; i < hp; i++) {
      const jcx = PAD + 30 + labelW + i * (jr * 2 + jg) + jr;
      const jcy = curY2 + HP_ROW_H / 2;

      ctx.save();
      // 主体（preview: radial-gradient(circle at 35% 35%, #DAA520, #8B6914)）
      const jGrad = ctx.createRadialGradient(jcx - jr * 0.3, jcy - jr * 0.3, 0, jcx, jcy, jr);
      jGrad.addColorStop(0, jadeColor);
      jGrad.addColorStop(1, jadeBorder);
      ctx.beginPath();
      ctx.arc(jcx, jcy, jr, 0, Math.PI * 2);
      ctx.fillStyle = jGrad;
      ctx.fill();

      // 外框（preview: border 2px solid #8B6914 → 4px）
      ctx.strokeStyle = jadeBorder;
      ctx.lineWidth = 4;
      ctx.stroke();

      // 内阴影（preview: boxShadow inset...）
      const isGrad = ctx.createRadialGradient(jcx, jcy, 0, jcx, jcy, jr);
      isGrad.addColorStop(0, 'transparent');
      isGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = isGrad;
      ctx.fill();

      // 阴阳鱼内点（preview: size*0.2→8.8px, top:30% left:50%）
      ctx.beginPath();
      ctx.arc(jcx + jr * 0.1, jcy - jr * 0.35, jr * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = jadeInner;
      ctx.fill();

      ctx.restore();
    }
  }

  // 体力行底部分隔线
  curY2 += HP_ROW_H;
  ctx.save();
  ctx.strokeStyle = `${GOLD}25`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD + 30, curY2);
  ctx.lineTo(W - PAD - 30, curY2);
  ctx.stroke();
  ctx.restore();
  curY2 += 14;

  // ═══════════════════════════════════════════
  // Z7-Z10: 技能完整描述区（preview: px:1.5→24, pt:1→16, pb:1→16）
  // ═══════════════════════════════════════════
  if (ch.skills.length > 0) {
    for (const skill of ch.skills) {
      const hasDesc = skill.description?.trim();
      // 预估描述行数
      const descLines = hasDesc ? Math.ceil(skill.description.length / 38) : 0;
      const bh = hasDesc ? 48 + 26 * descLines : 42; // nameRow + desc

      // 技能块背景（preview: mb:1→16, p:1→16, border GOLD35 2px, borderRadius 4px→8px）
      fillRR(ctx, PAD + 30, curY2, CW - 60, bh, 8, 'rgba(201,160,80,0.06)');
      strokeRR(ctx, PAD + 30, curY2, CW - 60, bh, 8, `${GOLD}35`, 2);

      // 技能名（preview: 0.8rem→26px, bold, #f5e6c0）
      ctx.save();
      ctx.font = `bold 26px ${FONT_FAMILY}`;
      ctx.fillStyle = TEXT_GOLD;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(skill.name, PAD + 46, curY2 + 12);

      // 类型标签 Chip（匹配 preview Chip: height 18→36, fontSize 0.58rem→19px, bg factionColor40）
      const typeLabel = skill.type === 'active' ? '主动' : skill.type === 'passive' ? '被动' : '特殊';
      const nameW = ctx.measureText(skill.name).width;
      const chipW = ctx.measureText(typeLabel).width + 16;
      const chipX = PAD + 46 + nameW + 12;
      const chipY = curY2 + 12;
      const chipH = 36;

      fillRR(ctx, chipX, chipY - 1, chipW, chipH, 6, hexToRgba(fc, 0.25));
      ctx.fillStyle = fc;
      ctx.font = `19px ${FONT_SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typeLabel, chipX + chipW / 2, chipY + chipH / 2 - 1);
      ctx.restore();

      // 技能描述（preview: 0.72rem→23px, #c9a050, lineHeight 1.6→37, letterSpacing 0.02em）
      if (hasDesc) {
        ctx.save();
        ctx.font = `23px ${FONT_FAMILY}`;
        ctx.fillStyle = GOLD;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        wrapText(ctx, skill.description, PAD + 46, curY2 + 50, CW - 92, 37, 8);
        ctx.restore();
      }

      curY2 += bh + 18; // mb:1=8px*2=16 → 18
    }
  }

  // ═══════════════════════════════════════════
  // 特质标签（preview: gap:0.4→6, mt:0.5→8, fontSize 0.63rem→20px, bg rgba(201,160,80,0.12), color #d4a84a, border GOLD60 1px, borderRadius 3px→6px, height 20→40）
  // ═══════════════════════════════════════════
  if (ch.traits.length > 0) {
    curY2 += 14;
    let tx = PAD + 30;
    const th = 40, tpad = 14, tgap = 8;
    ctx.save();
    ctx.font = `20px ${FONT_FAMILY}`;
    for (const trait of ch.traits) {
      const tw = ctx.measureText(trait).width + tpad * 2;
      if (tx + tw > W - PAD - 30) { tx = PAD + 30; curY2 += th + tgap; }
      // bg + border
      fillRR(ctx, tx, curY2, tw, th, 6, 'rgba(201,160,80,0.12)');
      strokeRR(ctx, tx, curY2, tw, th, 6, `${GOLD}60`, 1);
      ctx.fillStyle = '#d4a84a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(trait, tx + tw / 2, curY2 + th / 2);
      tx += tw + tgap;
    }
    ctx.restore();
    curY2 += th + 18;
  }

  // ═══════════════════════════════════════════
  // Z11-Z12: 底部信息栏（preview: px:1.5→24, py:0.6→10, borderTop GOLD30 2px, bg rgba(0,0,0,0.3)）
  // ═══════════════════════════════════════════
  const FOOT_Y = H_CARD - 52;
  const FOOT_H = 46;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(PAD, FOOT_Y, CW, FOOT_H);

  // 顶线
  ctx.strokeStyle = `${GOLD}30`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, FOOT_Y);
  ctx.lineTo(W - PAD, FOOT_Y);
  ctx.stroke();

  // 生卒年（preview: 0.6rem→19px, GOLD99, letterSpacing 0.04em）
  if (ch.birthYear !== undefined) {
    const ls = `${ch.birthYear} \u2014 ${ch.deathYear !== undefined ? ch.deathYear : '\u81F3\u4ECA'}`; // — 至今
    ctx.font = `19px ${FONT_FAMILY}`;
    ctx.fillStyle = `${GOLD}99`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(ls, PAD + 30, FOOT_Y + FOOT_H / 2);
  }

  // 势力名（preview: 0.6rem→19px, factionColor, letterSpacing 0.05em）
  ctx.font = `19px ${FONT_FAMILY}`;
  ctx.fillStyle = fc;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(fn, W - PAD - 30, FOOT_Y + FOOT_H / 2);

  ctx.restore();
}

// ── 辅助：hex→rgba ──
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ══════════════════════════════════════════════════
// React 组件
// ══════════════════════════════════════════════════

interface Props {
  character: Character;
  faction: Faction | undefined;
}

const CharacterCardExporter: React.FC<Props> = ({ character, faction }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [toast, setToast] = useState<{ open: boolean; msg: string; ok: boolean }>({
    open: false, msg: '', ok: true,
  });

  const handleExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const H = calcHeight(character);
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    try {
      await drawCard(ctx, character, faction);
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `${character.name}_卡牌.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setToast({ open: true, msg: `「${character.name}」卡牌已导出`, ok: true });
    } catch (e) {
      console.error('导出失败:', e);
      setToast({ open: true, msg: '导出失败，请重试', ok: false });
    }
  }, [character, faction]);

  return (
    <>
      <Tooltip title="导出三国杀风格卡牌" arrow>
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); handleExport(); }}
          sx={{
            color: '#c9a050',
            '&:hover': { color: '#f5d58a', bgcolor: 'rgba(201,160,80,0.12)' },
          }}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.ok ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CharacterCardExporter;

/** 静态导出方法 */
export async function exportCharacterCard(
  character: Character,
  faction: Faction | undefined,
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not supported');

  const H = calcHeight(character);
  canvas.width = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  await drawCard(ctx, character, faction);

  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.download = `${character.name}_卡牌.png`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
