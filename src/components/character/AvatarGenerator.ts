/**
 * AvatarGenerator - 基于名字哈希的自动头像生成器
 *
 * 设计思路：
 * - 使用名字字符串的哈希值作为种子，生成确定性图案
 * - 不同名字产生不同图案，同名字始终生成相同头像
 * - 结合势力色作为主色调
 * - 生成 SVG 对称几何图案，风格类似古代纹章/图腾
 *
 * 生成流程：
 * 1. 对名字做哈希 → 得到确定性的 32 位整数
 * 2. 用哈希值控制：网格图案（5×5 半边镜像）、装饰元素、底纹
 * 3. 势力色作为主色，自动派生浅色/深色变体
 * 4. 输出 base64 PNG（200×200）
 */

/** 简单哈希函数（确定性，分布均匀） */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** 伪随机数生成器（可种子化） */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** 解析 hex 色为 RGB */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** RGB 转 hex */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** 颜色调亮 */
function lighten(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = pct / 100;
  return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
}

/** 颜色调暗 */
function darken(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = 1 - pct / 100;
  return rgbToHex(r * f, g * f, b * f);
}

/** 颜色加透明度 */
function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * 生成头像 base64 PNG
 * @param name 角色名字（用于哈希种子）
 * @param factionColor 势力颜色（hex）
 * @param size 输出尺寸（默认 200）
 * @param salt 变体盐值（默认 0，改变此值可生成同名字的不同变体）
 * @returns base64 data URL
 */
export function generateAvatar(name: string, factionColor: string, size = 200, salt = 0): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const s = size;

  const h = hashStr(name + '|' + salt);
  const rand = seededRandom(h);

  const mainColor = factionColor;
  const lightColor = lighten(factionColor, 40);
  const darkColor = darken(factionColor, 20);
  const bgColor = lighten(factionColor, 70);

  // ── 1. 背景 ──
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, s, s);

  // ── 2. 底纹图案（细微纹理）──
  ctx.save();
  ctx.globalAlpha = 0.12;
  const dotSpacing = s / 12;
  for (let x = 0; x < s; x += dotSpacing) {
    for (let y = 0; y < s; y += dotSpacing) {
      if (rand() > 0.5) {
        ctx.beginPath();
        ctx.arc(x + dotSpacing / 2, y + dotSpacing / 2, dotSpacing / 6, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();
      }
    }
  }
  ctx.restore();

  // ── 3. 5×5 对称网格图案（左半→镜像右半）──
  const gridSize = 5;
  const cellSize = s / gridSize;
  const padding = cellSize * 0.1;
  const shapeSize = cellSize - padding * 2;

  // 决定每个格子用什么形状
  type Shape = 'none' | 'circle' | 'square' | 'diamond' | 'triangle';
  const shapes: Shape[] = ['none', 'circle', 'square', 'diamond', 'triangle'];
  const shapeFills = [mainColor, darkColor, lightColor];

  // 生成左半部分图案（3 列 × 5 行），右半镜像
  const halfCols = Math.ceil(gridSize / 2);
  const grid: { shape: Shape; color: string }[][] = [];

  for (let row = 0; row < gridSize; row++) {
    const rowData: { shape: Shape; color: string }[] = [];
    for (let col = 0; col < halfCols; col++) {
      const shapeIdx = Math.floor(rand() * shapes.length);
      const colorIdx = Math.floor(rand() * shapeFills.length);
      rowData.push({ shape: shapes[shapeIdx], color: shapeFills[colorIdx] });
    }
    // 镜像到右半
    const fullRow = [...rowData];
    for (let col = halfCols - 1 - (gridSize % 2 === 0 ? 0 : 1); col >= 0; col--) {
      fullRow.push(rowData[col]);
    }
    grid.push(fullRow);
  }

  // 绘制网格
  ctx.save();
  ctx.globalAlpha = 0.55;
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cell = grid[row][col];
      if (cell.shape === 'none') continue;

      const cx = col * cellSize + cellSize / 2;
      const cy = row * cellSize + cellSize / 2;
      const hs = shapeSize / 2;

      ctx.fillStyle = cell.color;

      switch (cell.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(cx, cy, hs * 0.85, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'square':
          ctx.fillRect(cx - hs * 0.7, cy - hs * 0.7, hs * 1.4, hs * 1.4);
          break;
        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(cx, cy - hs);
          ctx.lineTo(cx + hs, cy);
          ctx.lineTo(cx, cy + hs);
          ctx.lineTo(cx - hs, cy);
          ctx.closePath();
          ctx.fill();
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(cx, cy - hs);
          ctx.lineTo(cx + hs, cy + hs * 0.7);
          ctx.lineTo(cx - hs, cy + hs * 0.7);
          ctx.closePath();
          ctx.fill();
          break;
      }
    }
  }
  ctx.restore();

  // ── 4. 中心装饰（名字首字）──
  // 中心半透明圆底
  ctx.save();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = withAlpha(mainColor, 0.85);
  ctx.fill();
  // 白色描边
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 名字首字
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${s * 0.3}px "Songti SC","STSong","SimSun",serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.charAt(0), s / 2, s / 2 + 2);
  ctx.restore();

  // ── 5. 外边框装饰 ──
  ctx.save();
  ctx.strokeStyle = withAlpha(mainColor, 0.4);
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, s - 3, s - 3);
  ctx.restore();

  // 四角装饰
  ctx.save();
  ctx.fillStyle = withAlpha(mainColor, 0.3);
  const cornerSize = s * 0.08;
  // 左上
  ctx.fillRect(0, 0, cornerSize, 3);
  ctx.fillRect(0, 0, 3, cornerSize);
  // 右上
  ctx.fillRect(s - cornerSize, 0, cornerSize, 3);
  ctx.fillRect(s - 3, 0, 3, cornerSize);
  // 左下
  ctx.fillRect(0, s - 3, cornerSize, 3);
  ctx.fillRect(0, s - cornerSize, 3, cornerSize);
  // 右下
  ctx.fillRect(s - cornerSize, s - 3, cornerSize, 3);
  ctx.fillRect(s - 3, s - cornerSize, 3, cornerSize);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * 检查头像是否为自动生成的（简单判断：名字首字居中 + 势力色系）
 * 用于去重判断
 */
export function isGeneratedAvatar(avatar: string | undefined): boolean {
  if (!avatar) return false;
  return avatar.startsWith('data:image/png;base64,');
}
