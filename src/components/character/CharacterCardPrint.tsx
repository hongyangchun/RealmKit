/**
 * CharacterCardPrint - 打印用三国杀人物卡片 (纯 CSS 渲染)
 * 物理尺寸: 63mm × 88mm (标准扑克牌尺寸)
 * 支持 2mm 出血区 + 裁切标记
 *
 * 设计对照: CharacterCard.tsx v2.0 (12区布局)
 * Z1-Z2: 称号+姓名  Z3-Z5: 插画区  Z6: 勾玉体力
 * Z7-Z10: 技能描述  Z11-Z12: 底部信息栏
 */
import React from 'react';
import type { Character, Faction, CardRarity } from '../../types';

// ── 物理尺寸 (mm) ──
const CARD_W = 63;          // 卡片宽
const CARD_H = 88;          // 卡片高
const BLEED = 2;            // 出血区
const CUTMARK_LEN = 3;      // 裁切线长度
const CUTMARK_GAP = 1.5;    // 裁切线距卡片边距

const TOTAL_W = CARD_W + BLEED * 2;   // 含出血总宽
const TOTAL_H = CARD_H + BLEED * 2;   // 含出血总高

// ── 稀有度配色 ──
const RARITY_COLORS: Record<CardRarity, { border: string; bg: string; text: string }> = {
  common:    { border: '#666', bg: '#2a2a2a', text: '#999' },
  rare:      { border: '#4a9eff', bg: '#1a3050', text: '#4a9eff' },
  epic:      { border: '#9a4aff', bg: '#301a50', text: '#9a4aff' },
  legendary: { border: '#ff9a4a', bg: '#503a1a', text: '#ff9a4a' },
};

// ── 工具函数 ──

/** 颜色加深（RGB 混合黑色） */
function darkenColor(hex: string, ratio: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.round(r * (1 - ratio));
    const dg = Math.round(g * (1 - ratio));
    const db = Math.round(b * (1 - ratio));
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  } catch { return '#2a1a0a'; }
}

// ── Props ──

interface CharacterCardPrintProps {
  character: Character;
  faction: Faction | undefined;
}

// ── 主组件 ──

const CharacterCardPrint = React.memo<CharacterCardPrintProps>(({ character, faction }) => {
  const fc = faction?.color ?? '#8B4513';
  const fn = faction?.name ?? '无势力';
  const rarity = RARITY_COLORS[character.rarity ?? 'common'];
  const rarityLabel = character.rarity === 'common' ? '普通'
    : character.rarity === 'rare' ? '稀有'
    : character.rarity === 'epic' ? '史诗'
    : '传说';
  const hp = character.hp ?? 4;
  const lifespan = character.birthYear !== undefined
    ? `${character.birthYear}${character.deathYear !== undefined ? `~${character.deathYear}` : '~今'}`
    : '';
  const headerBg = darkenColor(fc, 0.2);
  const headerBg2 = darkenColor(fc, 0.45);

  // ── 裁切线角标 ──
  const cutMarks = [
    { top: -CUTMARK_LEN - CUTMARK_GAP, left: -CUTMARK_GAP, w: CUTMARK_LEN, h: 1, isH: true },
    { top: -CUTMARK_GAP, left: -CUTMARK_LEN - CUTMARK_GAP, w: 1, h: CUTMARK_LEN, isH: false },
    { top: -CUTMARK_LEN - CUTMARK_GAP, right: -CUTMARK_GAP, w: CUTMARK_LEN, h: 1, isH: true },
    { top: -CUTMARK_GAP, right: -CUTMARK_LEN - CUTMARK_GAP, w: 1, h: CUTMARK_LEN, isH: false },
    { bottom: -CUTMARK_LEN - CUTMARK_GAP, left: -CUTMARK_GAP, w: CUTMARK_LEN, h: 1, isH: true },
    { bottom: -CUTMARK_GAP, left: -CUTMARK_LEN - CUTMARK_GAP, w: 1, h: CUTMARK_LEN, isH: false },
    { bottom: -CUTMARK_LEN - CUTMARK_GAP, right: -CUTMARK_GAP, w: CUTMARK_LEN, h: 1, isH: true },
    { bottom: -CUTMARK_GAP, right: -CUTMARK_LEN - CUTMARK_GAP, w: 1, h: CUTMARK_LEN, isH: false },
  ];

  return (
    <div style={{
      width: `${CARD_W}mm`,
      height: `${CARD_H}mm`,
      position: 'relative',
      background: '#1a100a',
      borderRadius: '4px',
      fontFamily: '"SimSun","STSong","Songti SC","Noto Serif SC",serif',
      border: `1px solid ${fc}cc`,
      boxSizing: 'border-box',
      // 纹理底纹
      backgroundImage: `repeating-linear-gradient(-55deg, transparent, transparent 2px, rgba(255,255,255,0.01) 2px, rgba(255,255,255,0.01) 2.5px)`,
    }}>
      {/* 裁切线 */}
      {cutMarks.map((m, i) => (
        <div key={i} style={{
          position: 'absolute',
          background: '#000',
          zIndex: 10,
          top: m.top !== undefined ? `${m.top}mm` : undefined,
          bottom: m.bottom !== undefined ? `${m.bottom}mm` : undefined,
          left: m.left !== undefined ? `${m.left}mm` : undefined,
          right: m.right !== undefined ? `${m.right}mm` : undefined,
          width: m.isH ? `${m.w}mm` : `${m.w}px`,
          height: m.isH ? `${m.h}px` : `${m.h}mm`,
        }} />
      ))}

      {/* Z1-Z2: 称号 + 姓名栏 */}
      <div style={{
        background: `linear-gradient(135deg, ${headerBg}, ${headerBg2})`,
        borderBottom: '0.5px solid rgba(201,160,80,0.3)',
        padding: '2mm 3mm 1.5mm',
        textAlign: 'center',
      }}>
        {character.nickname && (
          <div style={{
            color: 'rgba(201,160,80,0.75)',
            fontSize: '2.5mm',
            letterSpacing: '0.3mm',
          }}>
            「{character.nickname}」
          </div>
        )}
        <div style={{
          fontWeight: 700,
          color: '#f5e6c0',
          fontSize: '5mm',
          lineHeight: 1.2,
          letterSpacing: '0.2mm',
        }}>
          {character.name}
        </div>
        {character.title && (
          <div style={{ color: 'rgba(201,160,80,0.5)', fontSize: '2mm', marginTop: '0.3mm' }}>
            {character.title}
          </div>
        )}
      </div>

      {/* Z3-Z5: 插画区 */}
      <div style={{
        background: darkenColor(fc, 0.35),
        height: '38mm',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderBottom: '0.5px solid rgba(201,160,80,0.2)',
        overflow: 'hidden',
      }}>
        {character.portrait ? (
          <img src={character.portrait} alt={character.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '12mm', height: '12mm',
            border: '0.5px solid rgba(201,160,80,0.4)',
            borderRadius: '1mm',
            background: darkenColor(fc, 0.5),
            color: '#f5e6c0',
            fontSize: '8mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {character.name.charAt(0)}
          </div>
        )}
        {/* 暗角 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(26,16,10,0.75) 100%)',
          pointerEvents: 'none',
        }} />

        {/* 卡牌编号 */}
        {character.cardNumber && (
          <div style={{
            position: 'absolute', top: '1mm', left: '1mm',
            fontSize: '2mm', color: 'rgba(201,160,80,0.5)',
            background: 'rgba(0,0,0,0.5)',
            padding: '0.3mm 0.8mm', borderRadius: '0.5mm',
          }}>
            {character.cardNumber}
          </div>
        )}

        {/* 稀有度角标 */}
        <div style={{
          position: 'absolute', top: '1mm', right: '1mm',
          padding: '0.3mm 1mm', borderRadius: '0.5mm',
          background: rarity.bg,
          border: `0.5px solid ${rarity.border}`,
          fontSize: '2mm', color: rarity.text,
          letterSpacing: '0.1mm',
        }}>
          {rarityLabel}
        </div>
      </div>

      {/* Z6: 勾玉体力 */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '1mm 3mm',
        borderBottom: '0.5px solid rgba(201,160,80,0.15)',
        gap: '1mm',
      }}>
        <span style={{ fontSize: '2.5mm', color: 'rgba(201,160,80,0.6)', whiteSpace: 'nowrap' }}>体力</span>
        {Array.from({ length: Math.min(hp, 8) }).map((_, i) => (
          <div key={i} style={{
            width: '3mm', height: '3mm', borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #ddc274, #c9a84c 70%, #8B6914)',
            border: '0.3px solid #8B6914',
            flexShrink: 0,
          }} />
        ))}
      </div>

      {/* Z7-Z10: 技能描述区 */}
      <div style={{
        padding: '1.5mm 3mm 2mm',
        flex: 1,
        overflow: 'hidden',
      }}>
        {character.skills.slice(0, 3).map((skill, idx) => (
          <div key={idx} style={{
            marginBottom: '1mm',
            padding: '1mm 1.5mm',
            border: '0.3px solid rgba(201,160,80,0.2)',
            borderRadius: '0.8mm',
            background: 'rgba(201,160,80,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5mm', marginBottom: '0.3mm' }}>
              <span style={{
                fontSize: '2.8mm', fontWeight: 700, color: '#f5e6c0',
                letterSpacing: '0.05mm',
              }}>
                {skill.name}
              </span>
              <span style={{
                fontSize: '1.8mm',
                padding: '0.1mm 0.6mm',
                borderRadius: '0.4mm',
                background: `${fc}30`,
                color: fc,
              }}>
                {skill.type === 'active' ? '主动' : skill.type === 'passive' ? '被动' : '特殊'}
              </span>
            </div>
            {skill.description && (
              <div style={{
                fontSize: '2.2mm', color: 'rgba(201,160,80,0.7)',
                lineHeight: 1.5, letterSpacing: '0.02mm',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {skill.description}
              </div>
            )}
          </div>
        ))}

        {/* 特质标签 */}
        {character.traits.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5mm', marginTop: '0.5mm' }}>
            {character.traits.slice(0, 4).map((trait) => (
              <span key={trait} style={{
                fontSize: '2mm',
                padding: '0.2mm 1mm',
                background: 'rgba(201,160,80,0.1)',
                color: '#d4a84a',
                border: '0.2px solid rgba(201,160,80,0.3)',
                borderRadius: '0.5mm',
              }}>
                {trait}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Z11-Z12: 底部信息栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1mm 3mm',
        borderTop: '0.5px solid rgba(201,160,80,0.2)',
        background: 'rgba(0,0,0,0.3)',
        fontSize: '2mm',
      }}>
        <span style={{ color: 'rgba(201,160,80,0.5)', letterSpacing: '0.1mm' }}>
          {lifespan || fn}
        </span>
        <span style={{ color: fc }}>
          {fn}
        </span>
      </div>
    </div>
  );
});

export default CharacterCardPrint;
export { CARD_W, CARD_H, BLEED, TOTAL_W, TOTAL_H };
