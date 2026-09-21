// 一次性脚本：生成 PWA 占位图标 icon-192.png / icon-512.png
// 深色底 #0d1117 + 绿色 #22c55e 黑桃♠（倒三角 + 两圆 + 短竖柄）。
// 零依赖：手写最小 PNG 编码器（IHDR/IDAT/IEND + CRC32，filter 0 原始行 deflate 存储）。
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pubDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// --- CRC32 ---
const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function makePng(size) {
  const BG = [13, 17, 23], FG = [34, 197, 94];
  const px = Buffer.alloc(size * size * 3);
  const cx = size / 2, cy = size * 0.42, r = size * 0.22, r2 = r * 1.18;
  const triTop = cy - r * 0.55, triBot = cy + r * 1.05;
  const stemW = size * 0.045, stemTop = cy + r * 0.55, stemBot = cy + r * 1.5;
  const inside = (x, y) => {
    // 倒三角
    if (y >= triTop && y <= triBot) {
      const t = (y - triTop) / (triBot - triTop);
      const half = r * (1 - t * 0.85);
      if (Math.abs(x - cx) <= half) return true;
    }
    // 两圆（左右瓣）
    for (const ox of [-1, 1]) {
      const cxx = cx + ox * r * 0.72, cyy = cy + r * 0.28;
      const dx = x - cxx, dy = y - cyy;
      if (dx * dx + dy * dy <= r2 * r2) return true;
    }
    // 短竖柄
    if (x >= cx - stemW && x <= cx + stemW && y >= stemTop && y <= stemBot) return true;
    return false;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r0, g0, b0] = inside(x + 0.5, y + 0.5) ? FG : BG;
      const i = (y * size + x) * 3;
      px[i] = r0; px[i + 1] = g0; px[i + 2] = b0;
    }
  }
  // filter 0 逐行前缀
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit, truecolor RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const file = join(pubDir, `icon-${size}.png`);
  writeFileSync(file, makePng(size));
  console.log(`wrote ${file}`);
}
