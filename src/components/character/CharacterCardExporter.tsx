/**
 * CharacterCardExporter - 三国杀风格卡片导出器
 * 纯 Canvas API 绘制，导出高清 PNG
 *
 * 设计原则：
 * - 标准扑克牌比例 (~5:7)，适合打印
 * - 动态高度，内容多时自动延长，不会重叠
 * - 三国杀风格：势力色主题 + 羊皮纸质感 + 金色装饰
 */
import React, { useCallback, useRef, useState } from 'react';
import { IconButton, Tooltip, Snackbar, Alert } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import type { Character, Skill, Faction } from '../../types';

// ── 尺寸（2x 高清）──
const W = 600;          // 卡片宽
const PAD = 32;          // 内边距
const CW = W - PAD * 2; // 内容区宽

// ── 配色 ──
const BG      = '#faf3e0';
const BG_DARK = '#ede4cc';
const INK     = '#2c2c3a';
const INK2    = '#555';
const INK3    = '#888';
const GOLD    = '#c9a84c';
const GOLD_L  = '#ddc274';

const SKILL_S: Record<Skill['type'], { bg: string; border: string; text: string; label: string }> = {
  active:  { bg: '#fff6dc', border: '#d4940a', text: '#a06800', label: '主动' },
  passive: { bg: '#e6f0fa', border: '#2e7cb5', text: '#1a5f8a', label: '被动' },
  special: { bg: '#f0e6f6', border: '#8344a8', text: '#6a2d8a', label: '特殊' },
};

// ── 绘图工具 ──

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

/** 文字换行，返回占用高度 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  maxW: number, lh: number, maxLines = 99,
): { height: number; lines: number } {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW && cur) {
      lines.push(cur); cur = ch;
    } else { cur += ch; }
  }
  if (cur) lines.push(cur);
  const show = lines.slice(0, maxLines);
  show.forEach((l, i) => {
    const t = i === maxLines - 1 && lines.length > maxLines ? l.slice(0, -1) + '…' : l;
    ctx.fillText(t, x, y + i * lh);
  });
  return { height: show.length * lh, lines: show.length };
}

/** 金色装饰线 */
function goldLine(ctx: CanvasRenderingContext2D, y: number) {
  const cx = W / 2;
  ctx.save();
  // 渐变线
  const grad = ctx.createLinearGradient(PAD, y, W - PAD, y);
  grad.addColorStop(0, 'rgba(201,168,76,0)');
  grad.addColorStop(0.2, 'rgba(201,168,76,0.6)');
  grad.addColorStop(0.5, GOLD);
  grad.addColorStop(0.8, 'rgba(201,168,76,0.6)');
  grad.addColorStop(1, 'rgba(201,168,76,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  // 中心菱形
  const d = 4;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(cx, y - d); ctx.lineTo(cx + d, y); ctx.lineTo(cx, y + d); ctx.lineTo(cx - d, y);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** 绘制圆形头像 */
function drawAvatar(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  name: string,
  fc: string,
  cx: number, cy: number, r: number,
) {
  ctx.save();
  // 外环
  ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.fillStyle = fc; ctx.fill();
  // 金环
  ctx.beginPath(); ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
  ctx.fillStyle = GOLD; ctx.fill();
  // 裁切
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = '#fffef8';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = fc;
    ctx.font = `bold ${r}px "Songti SC","STSong","SimSun",serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name.charAt(0), cx, cy + 2);
  }
  ctx.restore();
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// ── 预计算内容高度 ──

function calcCardHeight(ch: Character): number {
  let h = 0;
  // 顶部色带
  h += 68;
  // 头像区
  h += 220;
  // 姓名 + 生卒年
  h += 56;
  if (ch.birthYear !== undefined) h += 22;
  // 分隔线间距
  h += 20;

  // 技能区
  if (ch.skills.length > 0) {
    h += 24; // 标题
    h += ch.skills.length * 52 + (ch.skills.length - 1) * 6; // 每技能块
  }

  // 特质区
  if (ch.traits.length > 0) {
    h += 24 + 34;
  }

  // 传记区（预估 2 行）
  if (ch.bio) {
    h += 14 + 22 * 2 + 8;
  }

  // 底栏
  h += 44;
  // 底边距
  h += PAD;

  return Math.max(h, 700);
}

// ── 主绘制 ──

async function drawCard(
  ctx: CanvasRenderingContext2D,
  ch: Character,
  faction: Faction | undefined,
) {
  const fc = faction?.color ?? '#8B4513';
  const fn = faction?.name ?? '无势力';
  const H = calcCardHeight(ch);

  // ── 1. 背景底色 ──
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // ── 2. 外边框（势力色）──
  strokeRR(ctx, 3, 3, W - 6, H - 6, 16, fc, 3);
  // 内边框（金色）
  strokeRR(ctx, 10, 10, W - 20, H - 20, 12, GOLD_L, 1);

  // ── 3. 顶部势力色带 ──
  const headerH = 64;
  ctx.save();
  rr(ctx, 10, 10, W - 20, headerH, 12);
  ctx.clip();
  // 渐变色带
  const hGrad = ctx.createLinearGradient(10, 10, W - 10, 10);
  hGrad.addColorStop(0, fc);
  hGrad.addColorStop(0.5, lighten(fc, 15));
  hGrad.addColorStop(1, fc);
  ctx.fillStyle = hGrad;
  ctx.fillRect(10, 10, W - 20, headerH);
  ctx.restore();

  // 顶部文字
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const hcy = 10 + headerH / 2;
  if (ch.title) {
    ctx.font = 'italic 17px serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(ch.title, W / 2, hcy - 12);
    ctx.font = 'bold 22px serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(fn, W / 2, hcy + 12);
  } else {
    ctx.font = 'bold 24px serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(fn, W / 2, hcy);
  }
  ctx.restore();

  // ── 4. 头像区 ──
  const avatarTop = headerH + 16;
  const avatarAreaH = 200;
  fillRR(ctx, PAD, avatarTop, CW, avatarAreaH, 8, BG_DARK);
  strokeRR(ctx, PAD, avatarTop, CW, avatarAreaH, 8, `${fc}25`, 1);

  const acx = W / 2;
  const acy = avatarTop + avatarAreaH / 2;
  const ar = 75;

  let avatarImg: HTMLImageElement | null = null;
  if (ch.avatar) {
    try { avatarImg = await loadImg(ch.avatar); } catch { /* fallback */ }
  }
  drawAvatar(ctx, avatarImg, ch.name, fc, acx, acy, ar);

  // ── 5. 姓名区 ──
  let curY = avatarTop + avatarAreaH + 10;
  goldLine(ctx, curY);
  curY += 14;

  ctx.save();
  ctx.font = 'bold 36px serif';
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(ch.name, W / 2, curY);
  // 用 measureText 精确测量姓名实际高度
  const nameMetrics = ctx.measureText(ch.name);
  const nameH = Math.ceil(nameMetrics.actualBoundingBoxAscent + nameMetrics.actualBoundingBoxDescent) || 40;
  ctx.restore();

  curY += nameH + 8;

  // 生卒年
  if (ch.birthYear !== undefined) {
    ctx.save();
    ctx.font = '16px serif';
    ctx.fillStyle = INK3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const ls = `${ch.birthYear} — ${ch.deathYear !== undefined ? ch.deathYear : '今'}`;
    ctx.fillText(ls, W / 2, curY);
    ctx.restore();
    curY += 22;
  }

  goldLine(ctx, curY);
  curY += 16;

  // ── 6. 技能区 ──
  if (ch.skills.length > 0) {
    // 小标题
    ctx.save();
    ctx.font = 'bold 18px serif';
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText('技  能', PAD + 4, curY + 14);
    ctx.restore();
    curY += 26;

    for (const skill of ch.skills) {
      const s = SKILL_S[skill.type];
      const hasDesc = skill.description && skill.description.trim();
      const bh = hasDesc ? 50 : 30;

      // 背景
      fillRR(ctx, PAD, curY, CW, bh, 6, s.bg);
      strokeRR(ctx, PAD, curY, CW, bh, 6, s.border, 1);

      // 左侧色条
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(PAD + 3, curY + 6);
      ctx.lineTo(PAD + 3, curY + bh - 6);
      ctx.strokeStyle = s.border; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      // 技能名 + 类型
      ctx.save();
      ctx.textBaseline = 'middle';
      const nx = PAD + 14;
      ctx.font = 'bold 16px serif';
      ctx.fillStyle = s.text;
      ctx.textAlign = 'left';
      ctx.fillText(skill.name, nx, curY + bh / 2 - (hasDesc ? 6 : 0));
      const nw = ctx.measureText(skill.name).width;
      ctx.font = '12px sans-serif';
      ctx.fillStyle = s.border;
      ctx.fillText(`[${s.label}]`, nx + nw + 6, curY + bh / 2 - (hasDesc ? 6 : 0));

      if (hasDesc) {
        ctx.font = '13px sans-serif';
        ctx.fillStyle = INK3;
        wrapText(ctx, skill.description, nx, curY + bh / 2 + 10, CW - 22, 16, 1);
      }
      ctx.restore();

      curY += bh + 5;
    }
  }

  // ── 7. 特质区 ──
  if (ch.traits.length > 0) {
    curY += 6;
    ctx.save();
    ctx.font = 'bold 18px serif';
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText('特  质', PAD + 4, curY + 14);
    ctx.restore();
    curY += 26;

    let tx = PAD;
    const th = 26, tpad = 10, tgap = 5;
    for (const trait of ch.traits) {
      ctx.save();
      ctx.font = '14px sans-serif';
      const tw = ctx.measureText(trait).width + tpad * 2;
      if (tx + tw > W - PAD) { tx = PAD; curY += th + tgap; }
      fillRR(ctx, tx, curY, tw, th, 4, '#f0ead6');
      strokeRR(ctx, tx, curY, tw, th, 4, '#c4b896', 1);
      ctx.fillStyle = '#554433';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(trait, tx + tw / 2, curY + th / 2);
      ctx.restore();
      tx += tw + tgap;
    }
    curY += th + 8;
  }

  // ── 8. 传记区 ──
  if (ch.bio) {
    curY += 4;
    goldLine(ctx, curY);
    curY += 12;
    ctx.save();
    ctx.font = '14px sans-serif';
    ctx.fillStyle = INK2;
    ctx.textAlign = 'left';
    // 最多渲染到底栏上方
    const maxBioH = H - 44 - PAD - curY;
    const maxLines = Math.max(1, Math.floor(maxBioH / 20));
    const { height: usedH } = wrapText(ctx, ch.bio, PAD + 4, curY + 4, CW - 8, 20, maxLines);
    curY += usedH + 4;
    ctx.restore();
  }

  // ── 9. 底栏 ──
  const footerY = H - 44;
  ctx.save();
  ctx.fillStyle = fc;
  ctx.fillRect(10, footerY, W - 20, 34);
  // 金色顶线
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(10, footerY); ctx.lineTo(W - 10, footerY); ctx.stroke();
  // 文字
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${fn}${ch.title ? ` · ${ch.title}` : ''}`, W / 2, footerY + 17);
  ctx.restore();
}

/** 颜色加亮 */
function lighten(hex: string, pct: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * pct / 100));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * pct / 100));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * pct / 100));
  return `rgb(${r},${g},${b})`;
}

// ── React 组件 ──

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

    // 动态高度
    const H = calcCardHeight(character);
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
            color: '#1a237e',
            '&:hover': { color: '#0d1557', bgcolor: 'rgba(26,35,126,0.08)' },
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

/** 静态方法：导出单个人物卡牌为 PNG（无需 React 组件实例） */
export async function exportCharacterCard(
  character: Character,
  faction: Faction | undefined,
): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not supported');

  const H = calcCardHeight(character);
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
