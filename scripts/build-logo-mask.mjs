/** Preserve the supplied pixels. Trace the connected white sticker border and
 * retain its circular emblem; write only an SVG display mask, never edit the PNG. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './lib/common.mjs';

const width = 2048, height = 1117;
const pixels = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(ROOT, 'public/brand/dreamy-d-original.png'), '-vf', `scale=${width}:${height}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 12 * 1024 * 1024 });
const white = new Uint8Array(width * height);
for (let y = 435; y < 910; y++) for (let x = 500; x < 1550; x++) {
  const i = y * width + x, rgb = pixels.subarray(i * 3, i * 3 + 3);
  white[i] = Math.min(...rgb) > 241 && Math.max(...rgb) - Math.min(...rgb) < 15 ? 1 : 0;
}
const queue = new Int32Array(width * height);
let largest = [];
for (let i = 0; i < white.length; i++) {
  if (!white[i]) continue;
  let head = 0, tail = 1;
  queue[0] = i;
  white[i] = 0;
  while (head < tail) {
    const p = queue[head++];
    for (const next of [p - 1, p + 1, p - width, p + width]) {
      if (next < 0 || next >= white.length || !white[next]) continue;
      white[next] = 0;
      queue[tail++] = next;
    }
  }
  if (tail > largest.length) largest = Array.from(queue.subarray(0, tail));
}
if (largest.length < 20000) throw new Error('Could not identify the connected logo border');
const barrier = new Uint8Array(width * height);
for (const p of largest) barrier[p] = 1;
// Fill everything enclosed by the white outer border (lettering, holes, stars).
const outside = new Uint8Array(width * height);
queue[0] = 0; outside[0] = 1;
let head = 0, tail = 1;
while (head < tail) {
  const p = queue[head++], x = p % width;
  for (const next of [x ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width]) {
    if (next < 0 || next >= outside.length || outside[next] || barrier[next]) continue;
    outside[next] = 1;
    queue[tail++] = next;
  }
}
let runs = '';
for (let y = 435; y < 910; y++) {
  for (let x = 500; x < 1550; x++) {
    if (outside[y * width + x]) continue;
    const start = x;
    while (x < 1550 && !outside[y * width + x]) x++;
    runs += `M${start} ${y}h${x-start}v1h-${x-start}z`;
  }
}
// The crescent, star and telescope extend above the circular gold rim.
const crest = 'M836 296C832 231 887 132 980 116Q1008 110 993 138C929 209 983 313 1081 320Q1118 313 1110 332L1100 349L1120 358L1136 302L1107 295L1080 300Q1069 295 1070 279L1080 265L1084 244L1200 163Q1220 143 1239 163C1262 180 1273 216 1259 238L1180 273L1185 307L1200 325L1216 344L1236 318C1270 262 1332 297 1322 341Q1317 369 1283 382L1261 408C1275 453 1224 479 1189 457L802 450L802 374C777 345 795 304 836 296Z';
const star = 'M1118 108Q1125 106 1130 115L1137 130L1153 132Q1162 134 1156 144L1144 155L1146 173Q1145 181 1137 177L1122 169L1108 178Q1097 181 1098 170L1101 153L1089 143Q1083 132 1095 129L1109 128Z';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1117" viewBox="0 0 2048 1117"><circle cx="1034" cy="566" r="438" fill="white"/><path d="${runs}" fill="white"/><path d="${crest} ${star}" fill="white"/></svg>`;
fs.writeFileSync(path.join(ROOT, 'public/brand/logo-mask.svg'), svg);
console.log(`[brand] logo mask: ${largest.length} connected border pixels; original PNG unchanged`);
