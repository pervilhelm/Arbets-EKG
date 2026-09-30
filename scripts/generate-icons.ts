// Generates the PWA icons (PNG) and favicon (SVG) from one ECG-trace design.
// Run with: npx tsx scripts/generate-icons.ts
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [15, 23, 42]; // slate-900
const FG = [248, 250, 252]; // slate-50

// One P-QRS-T complex in a 0..1 unit square. The trace stays inside the
// central 80 % so the icon also works as a maskable icon.
const TRACE: [number, number][] = [
  [0.14, 0.56],
  [0.3, 0.56],
  [0.34, 0.5],
  [0.38, 0.56],
  [0.44, 0.56],
  [0.47, 0.62],
  [0.52, 0.22],
  [0.57, 0.76],
  [0.6, 0.56],
  [0.66, 0.56],
  [0.72, 0.46],
  [0.78, 0.56],
  [0.86, 0.56],
];
const STROKE = 0.045;

function distToSegment(px: number, py: number, [ax, ay]: number[], [bx, by]: number[]): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function renderPng(size: number): Buffer {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const halfWidth = (STROKE * size) / 2;
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let d = Infinity;
      for (let i = 0; i < TRACE.length - 1; i++) {
        d = Math.min(d, distToSegment((x + 0.5) / size, (y + 0.5) / size, TRACE[i], TRACE[i + 1]) * size);
      }
      const a = Math.max(0, Math.min(1, halfWidth + 0.5 - d));
      for (let c = 0; c < 3; c++) raw[row + 1 + x * 3 + c] = Math.round(BG[c] + (FG[c] - BG[c]) * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function renderSvg(): string {
  const points = TRACE.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");
  const rgb = (c: number[]) => `rgb(${c.join(",")})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="${rgb(BG)}"/><polyline points="${points}" fill="none" stroke="${rgb(FG)}" stroke-width="${STROKE * 100}" stroke-linejoin="round" stroke-linecap="round"/></svg>\n`;
}

writeFileSync("public/icons/icon-192.png", renderPng(192));
writeFileSync("public/icons/icon-512.png", renderPng(512));
writeFileSync("public/apple-touch-icon.png", renderPng(180));
writeFileSync("public/favicon.svg", renderSvg());
console.log("Icons written to public/");
