/**
 * CharacterCardPrintSheet - A4 打印排版组件
 *
 * 布局: A4 (210×297mm) → 3列×3行 = 9张卡片/页
 * 卡片尺寸: 63×88mm + 2mm 出血区
 *
 * 打印策略:
 * - 预览模式 (preview=true): 在 Dialog 内渲染，CSS scale 缩放
 * - 打印模式: 通过 printCharacterCards() 工具函数动态注入 body 级容器
 */
import React from 'react';
import CharacterCardPrint from './CharacterCardPrint';
import type { Character, Faction } from '../../types';

// ── 物理布局 (mm) ──
const A4_W = 210;
const A4_H = 297;
const CARD_W = 63;
const CARD_H = 88;
const BLEED = 2;
const COLS = 3;
const ROWS = 3;
const CARD_GAP_MM = 5;   // 卡片间隙
const MARGIN_MM = 5.5;    // 页边距

// ── 打印 CSS (注入到 <head>) ──
const PRINT_STYLE_ID = 'realmkit-print-css';

function injectPrintCSS() {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      @page { size: A4; margin: 0; }

      html, body {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* 隐藏除打印容器外的所有内容 */
      body > :not(#realmkit-print-root) {
        display: none !important;
      }

      /* 确保打印容器和内容可见 */
      #realmkit-print-root, #realmkit-print-root * {
        display: block !important;
        visibility: visible !important;
      }

      #realmkit-print-root {
        position: static !important;
      }

      /* 出血区 & 裁切线颜色保真 */
      .print-bleed, .print-sheet, .cut-mark {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* 每页一张 A4 */
      .print-sheet {
        page-break-after: always;
        page-break-inside: avoid;
        margin: 0 auto;
      }
      .print-sheet:last-child {
        page-break-after: auto;
      }
    }
  `;
  document.head.appendChild(style);
}

function removePrintCSS() {
  const el = document.getElementById(PRINT_STYLE_ID);
  if (el) el.remove();
}

// ── 单张 A4 纸 ──

interface SheetProps {
  characters: { character: Character; faction: Faction | undefined }[];
  sheetIndex: number;
}

const CharacterCardPrintSheet = React.memo<SheetProps>(({ characters, sheetIndex }) => {
  const PER_SHEET = COLS * ROWS;
  const sheetCards = characters.slice(sheetIndex * PER_SHEET, (sheetIndex + 1) * PER_SHEET);

  return (
    <div
      className="print-sheet"
      data-sheet={sheetIndex}
      style={{
        width: `${A4_W}mm`,
        height: `${A4_H}mm`,
        position: 'relative',
        background: '#fff',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {sheetCards.map(({ character, faction }, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        const left = MARGIN_MM + col * (CARD_W + CARD_GAP_MM);
        const top = MARGIN_MM + row * (CARD_H + CARD_GAP_MM);

        return (
          <div
            key={character.id}
            style={{
              position: 'absolute',
              left: `${left}mm`,
              top: `${top}mm`,
              width: `${CARD_W}mm`,
              height: `${CARD_H}mm`,
            }}
          >
            {/* 出血区 */}
            {col > 0 && (
              <div className="print-bleed" style={{
                position: 'absolute',
                left: `${-BLEED}mm`, top: 0,
                width: `${BLEED}mm`, height: `${CARD_H}mm`,
                background: '#1a100a', zIndex: -1,
              }} />
            )}
            {col < COLS - 1 && (
              <div className="print-bleed" style={{
                position: 'absolute',
                right: `${-BLEED}mm`, top: 0,
                width: `${BLEED}mm`, height: `${CARD_H}mm`,
                background: '#1a100a', zIndex: -1,
              }} />
            )}
            {row > 0 && (
              <div className="print-bleed" style={{
                position: 'absolute',
                top: `${-BLEED}mm`, left: 0,
                height: `${BLEED}mm`, width: `${CARD_W}mm`,
                background: '#1a100a', zIndex: -1,
              }} />
            )}
            {row < ROWS - 1 && (
              <div className="print-bleed" style={{
                position: 'absolute',
                bottom: `${-BLEED}mm`, left: 0,
                height: `${BLEED}mm`, width: `${CARD_W}mm`,
                background: '#1a100a', zIndex: -1,
              }} />
            )}

            <CharacterCardPrint character={character} faction={faction} />
          </div>
        );
      })}

      {/* 页脚 */}
      <div style={{
        position: 'absolute',
        bottom: '2mm',
        right: `${MARGIN_MM}mm`,
        fontSize: '2mm',
        color: '#ccc',
        fontFamily: 'sans-serif',
      }}>
        第 {sheetIndex + 1} 页
      </div>
    </div>
  );
});

// ── 完整打印容器 ──

interface PrintContainerProps {
  characters: { character: Character; faction: Faction | undefined }[];
  preview?: boolean;
}

const CharacterCardPrintContainer = React.memo<PrintContainerProps>(({ characters, preview = false }) => {
  const PER_SHEET = COLS * ROWS;
  const totalSheets = Math.ceil(characters.length / PER_SHEET);

  return (
    <div className={`print-area${preview ? ' preview' : ''}`}
      style={preview ? {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px',
        padding: '16px',
      } : undefined}
    >
      {Array.from({ length: totalSheets }).map((_, i) => (
        <CharacterCardPrintSheet
          key={i}
          characters={characters}
          sheetIndex={i}
        />
      ))}
    </div>
  );
});

// ── 工具函数：触发浏览器打印 ──

/**
 * printCharacterCards - 可靠的打印函数
 *
 * 策略: 在 <body> 直接插入打印容器 → 注入 @media print CSS →
 *       window.print() → afterprint 事件清理
 */
export async function printCharacterCards(
  characters: { character: Character; faction: Faction | undefined }[],
): Promise<void> {
  if (characters.length === 0) return;

  // 1. 注入打印 CSS
  injectPrintCSS();

  // 2. 创建打印容器
  const root = document.createElement('div');
  root.id = 'realmkit-print-root';
  root.style.cssText = 'display:none;'; // 屏幕时隐藏
  document.body.appendChild(root);

  // 3. 渲染打印内容到容器（用 ReactDOM，这里用纯 DOM 方式渲染简单结构）
  //    由于这是纯函数无 React 上下文，采用 innerHTML 方式
  const PER_SHEET = COLS * ROWS;
  const totalSheets = Math.ceil(characters.length / PER_SHEET);

  // 构建 HTML（简化但功能完整）
  const sheetsHTML = Array.from({ length: totalSheets }).map((_, si) => {
    const sheetCards = characters.slice(si * PER_SHEET, (si + 1) * PER_SHEET);
    const cardsHTML = sheetCards.map(({ character, faction }, idx) => {
      const fc = faction?.color ?? '#8B4513';
      const fn = faction?.name ?? '';
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const left = MARGIN_MM + col * (CARD_W + CARD_GAP_MM);
      const top = MARGIN_MM + row * (CARD_H + CARD_GAP_MM);
      const rarity = character.rarity === 'common' ? '普通'
        : character.rarity === 'rare' ? '稀有'
        : character.rarity === 'epic' ? '史诗'
        : '传说';
      const hp = character.hp ?? 4;
      const portraitHTML = character.portrait
        ? `<img src="${character.portrait}" style="width:100%;height:100%;object-fit:cover;" />`
        : `<div style="width:12mm;height:12mm;border:0.5px solid rgba(201,160,80,0.4);border-radius:1mm;background:#2a1a0a;color:#f5e6c0;font-size:8mm;display:flex;align-items:center;justify-content:center;">${character.name.charAt(0)}</div>`;

      return `<div style="position:absolute;left:${left}mm;top:${top}mm;width:${CARD_W}mm;height:${CARD_H}mm;">
        <div style="width:${CARD_W}mm;height:${CARD_H}mm;position:relative;background:#1a100a;border-radius:1mm;overflow:hidden;font-family:'SimSun','STSong',serif;border:0.5px solid ${fc}cc;box-sizing:border-box;">
          <div style="background:linear-gradient(135deg,${fc}99,${fc}44);border-bottom:0.3px solid rgba(201,160,80,0.3);padding:1.5mm 2mm;text-align:center;">
            ${character.nickname ? `<div style="color:rgba(201,160,80,0.7);font-size:2.5mm;">「${character.nickname}」</div>` : ''}
            <div style="font-weight:700;color:#f5e6c0;font-size:5mm;">${character.name}</div>
            ${character.title ? `<div style="color:rgba(201,160,80,0.5);font-size:2mm;">${character.title}</div>` : ''}
          </div>
          <div style="background:#2a1a0a;height:38mm;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
            ${portraitHTML}
            <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 30%,rgba(26,16,10,0.75) 100%);pointer-events:none;"></div>
            ${character.cardNumber ? `<div style="position:absolute;top:1mm;left:1mm;font-size:2mm;color:rgba(201,160,80,0.5);background:rgba(0,0,0,0.5);padding:0.3mm 0.8mm;border-radius:0.5mm;">${character.cardNumber}</div>` : ''}
            <div style="position:absolute;top:1mm;right:1mm;padding:0.3mm 1mm;border-radius:0.5mm;background:#2a2a2a;font-size:2mm;color:#999;">${rarity}</div>
          </div>
          <div style="display:flex;align-items:center;padding:1mm 2mm;gap:1mm;border-bottom:0.3px solid rgba(201,160,80,0.15);">
            <span style="font-size:2.5mm;color:rgba(201,160,80,0.6);">体力</span>
            ${Array.from({ length: Math.min(hp, 8) }).map(() =>
              `<span style="width:3mm;height:3mm;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ddc274,#c9a84c 70%,#8B6914);border:0.3px solid #8B6914;display:inline-block;flex-shrink:0;"></span>`
            ).join('')}
          </div>
          <div style="padding:1.5mm 2mm;flex:1;">
            ${character.skills.slice(0, 3).map(s => `
              <div style="margin-bottom:1mm;padding:1mm;border:0.3px solid rgba(201,160,80,0.2);border-radius:0.8mm;">
                <span style="font-size:2.8mm;font-weight:700;color:#f5e6c0;">${s.name}</span>
                ${s.description ? `<div style="font-size:2.2mm;color:rgba(201,160,80,0.7);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${s.description}</div>` : ''}
              </div>
            `).join('')}
            ${character.traits.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:0.5mm;margin-top:0.5mm;">${character.traits.slice(0,4).map(t => `<span style="font-size:2mm;padding:0.2mm 1mm;background:rgba(201,160,80,0.1);color:#d4a84a;border-radius:0.5mm;">${t}</span>`).join('')}</div>` : ''}
          </div>
          <div style="display:flex;justify-content:space-between;padding:1mm 2mm;border-top:0.3px solid rgba(201,160,80,0.2);background:rgba(0,0,0,0.3);font-size:2mm;color:rgba(201,160,80,0.5);">
            <span>${character.birthYear !== undefined ? `${character.birthYear}${character.deathYear !== undefined ? `~${character.deathYear}` : '~今'}` : fn}</span>
            <span style="color:${fc};">${fn}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    return `<div class="print-sheet" style="width:${A4_W}mm;height:${A4_H}mm;position:relative;background:#fff;overflow:hidden;margin:0 auto;">
      ${cardsHTML}
      <div style="position:absolute;bottom:2mm;right:${MARGIN_MM}mm;font-size:2mm;color:#ccc;">第 ${si + 1} 页</div>
    </div>`;
  }).join('');

  root.innerHTML = sheetsHTML;

  // 4. 等待渲染完成后触发打印
  await new Promise(resolve => requestAnimationFrame(resolve));

  // 5. 注册 afterprint 清理（含超时回退）
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (root.parentNode) document.body.removeChild(root);
    removePrintCSS();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  // 超时回退：60秒后强制清理
  setTimeout(cleanup, 60000);

  // 6. 触发打印
  window.print();
}

export default CharacterCardPrintContainer;
export { A4_W, A4_H, CARD_W as PRINT_CARD_W, CARD_H as PRINT_CARD_H, COLS, ROWS, injectPrintCSS, removePrintCSS };
