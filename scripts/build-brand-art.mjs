/** Original, deterministic scenery. Run once after editing, then bake Brand-Art
 * to public/brand/{dream-sky,sunny-meadow}.png. Episodes load the cached PNGs. */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/common.mjs';

const out = path.join(ROOT, 'public/brand');
fs.mkdirSync(out, { recursive: true });
let seed = 20260913;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const n = value => Number(value.toFixed(2));
const circle = (x, y, r, fill, opacity = 1) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}" opacity="${opacity}"/>`;
const ellipse = (x, y, rx, ry, fill, opacity = 1) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${opacity}"/>`;
const star = (x, y, size, fill, opacity = 1) => `<path d="M0 -${size}Q${size * .15} -${size * .15} ${size} 0Q${size * .15} ${size * .15} 0 ${size}Q-${size * .15} ${size * .15} -${size} 0Q-${size * .15} -${size * .15} 0 -${size}Z" transform="translate(${n(x)} ${n(y)})" fill="${fill}" opacity="${opacity}"/>`;
const defs = `<defs>
  <linearGradient id="sky" x2=".8" y2="1"><stop stop-color="#b1b5de"/><stop offset=".42" stop-color="#d2c5e5"/><stop offset="1" stop-color="#fbe5d6"/></linearGradient>
  <linearGradient id="day" x2=".25" y2="1"><stop stop-color="#a7cddb"/><stop offset=".52" stop-color="#e1e2e7"/><stop offset="1" stop-color="#fff0d2"/></linearGradient>
  <radialGradient id="glow"><stop stop-color="#fffce8" stop-opacity=".9"/><stop offset="1" stop-color="#ffedd4" stop-opacity="0"/></radialGradient>
  <radialGradient id="cloud" cx=".32" cy=".15" r=".9"><stop stop-color="#fff6df"/><stop offset=".35" stop-color="#f5dce3"/><stop offset=".68" stop-color="#d3cee9"/><stop offset="1" stop-color="#a3bbd7"/></radialGradient>
  <radialGradient id="pink" cx=".25" cy=".12" r=".93"><stop stop-color="#ffe9de"/><stop offset=".4" stop-color="#edc0d8"/><stop offset="1" stop-color="#b69cc7"/></radialGradient>
  <radialGradient id="mint" cx=".25" cy=".12" r=".95"><stop stop-color="#ecf4d3"/><stop offset=".36" stop-color="#b9ddc3"/><stop offset="1" stop-color="#75b5b0"/></radialGradient>
  <radialGradient id="lavender" cx=".2" cy=".12" r=".95"><stop stop-color="#f3e5ef"/><stop offset=".42" stop-color="#c7bcdb"/><stop offset="1" stop-color="#9da7c9"/></radialGradient>
  <radialGradient id="planet" cx=".25" cy=".2" r=".85"><stop stop-color="#fff1ce"/><stop offset=".45" stop-color="#efc8d9"/><stop offset=".8" stop-color="#b0afd7"/><stop offset="1" stop-color="#8a9cc5"/></radialGradient>
  <linearGradient id="hill" x2=".1" y2="1"><stop stop-color="#d8e3b5"/><stop offset="1" stop-color="#97c7ac"/></linearGradient>
  <linearGradient id="ground" x2=".2" y2="1"><stop stop-color="#dce7b7"/><stop offset=".6" stop-color="#a8caaa"/><stop offset="1" stop-color="#79aaa0"/></linearGradient>
  <linearGradient id="water" x2=".4" y2="1"><stop stop-color="#dbe7e6"/><stop offset=".5" stop-color="#a6d4d5"/><stop offset="1" stop-color="#91bfc6"/></linearGradient>
  <linearGradient id="bark"><stop stop-color="#dfc3ad"/><stop offset=".45" stop-color="#bf9b9d"/><stop offset="1" stop-color="#9b8c9c"/></linearGradient>
  <radialGradient id="petal" cx=".3" cy=".2"><stop stop-color="#fff1de"/><stop offset=".5" stop-color="#f1bacd"/><stop offset="1" stop-color="#c58dab"/></radialGradient>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".64" numOctaves="3" stitchTiles="stitch" seed="13"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".105"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter>
</defs>`;

function cloud(x, y, scale = 1, fill = 'cloud') {
  return `<g transform="translate(${x} ${y}) scale(${scale})">${ellipse(0, 36, 164, 59, `url(#${fill})`)}${circle(-110, 8, 62, `url(#${fill})`)}${circle(-52, -24, 77, `url(#${fill})`)}${circle(24, -40, 91, `url(#${fill})`)}${circle(110, 8, 68, `url(#${fill})`)}<path d="M-157 12Q-147 -38 -102 -36M-102 -42Q-70 -102 -16 -90M-11 -102Q41 -136 85 -86" fill="none" stroke="#fff5e3" stroke-width="5" stroke-linecap="round" opacity=".4"/></g>`;
}

function planet(x, y, scale) {
  return `<g transform="translate(${x} ${y}) rotate(-24) scale(${scale})"><ellipse rx="134" ry="33" fill="none" stroke="#f8ddc7" stroke-width="12"/>${circle(0, 0, 79, 'url(#planet)')}<path d="M-69 -36Q0 -12 70 -36M-77 -10Q0 18 79 -10M-75 20Q0 45 73 20" fill="none" stroke="#fae0d5" stroke-width="10" opacity=".4"/><path d="M-134 0A134 33 0 0 0 134 0" fill="none" stroke="#fde5c9" stroke-width="10"/><path d="M-138 7A138 37 0 0 0 138 7" fill="none" stroke="#b8a5cf" stroke-width="3" opacity=".6"/></g>`;
}

function sky() {
  let art = `<rect width="1920" height="1080" fill="url(#sky)"/>${ellipse(980, 420, 790, 650, 'url(#glow)')}`;
  for (let i = 0; i < 650; i++) {
    const x = random() * 1920, y = random() * 1080;
    art += circle(x, y, .5 + random() * 1.7, i % 3 ? '#fff6e1' : '#d9ffff', n(.2 + random() * .55));
  }
  // Delicate orbit trails arc around the logo's quiet center.
  for (let band = 0; band < 2; band++) {
    for (let i = 0; i < 1500; i++) {
      const x = random() * 2200 - 140;
      const y = 870 - .00036 * (x - 960) ** 2 + band * 24 + (random() - .5) * 25;
      art += circle(x, y, .45 + random() * 1.8, band ? '#fff6e9' : '#ffebaf', n(.22 + random() * .55));
    }
  }
  art += planet(320, 213, .85) + planet(1620, 270, .97);
  art += circle(120, 380, 25, 'url(#mint)') + circle(1770, 620, 30, 'url(#planet)');
  for (const [x, y, s] of [[161, 163, 13], [462, 102, 15], [1403, 126, 11], [1733, 123, 18], [1816, 419, 13], [228, 644, 17], [1510, 708, 10]]) art += star(x, y, s, '#fff7d7');
  art += `<g fill="none" stroke="#fff7e1" stroke-width="1.5" opacity=".6"><path d="M80 491L151 440L210 488L164 554L80 491M1620 435L1695 471L1740 425L1802 486"/></g>`;
  for (const [x, y] of [[80,491],[151,440],[210,488],[164,554],[1620,435],[1695,471],[1740,425],[1802,486]]) art += circle(x,y,4,'#fff9e5');
  art += cloud(-20, 535, 1.3, 'lavender') + cloud(1930, 520, 1.45, 'pink');
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 7; i++) {
      const x = -110 + i * 350 + row * 45;
      const y = 935 + row * 100 - Math.abs(x - 960) * .16;
      art += cloud(x, n(y), 1.1 + row * .12, row === 1 ? 'pink' : 'cloud');
    }
  }
  return art;
}

function tree(x, y, scale, color) {
  let art = `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-27 0Q-10 -143 -22 -297L24 -304Q10 -164 36 0Z" fill="url(#bark)"/><path d="M-3 -156Q-73 -203 -91 -273M12 -198Q77 -220 99 -277" fill="none" stroke="#bc9b9c" stroke-width="15" stroke-linecap="round"/>`;
  art += cloud(0, -330, 1.05, color) + cloud(-65, -283, .85, color) + cloud(70, -279, .9, color);
  for (let i = 0; i < 90; i++) {
    const px = (random() - .5) * 280, py = -350 + random() * 100;
    art += ellipse(n(px), n(py), 3 + n(random() * 5), 2 + n(random() * 3), '#fff7df', n(.15 + random() * .25));
  }
  art += `<path d="M-5 -29Q-14 -89 -3 -117M14 -60Q6 -132 16 -161" fill="none" stroke="#f2d8ba" stroke-width="3" opacity=".6"/></g>`;
  return art;
}

function flower(x, y, scale, color = 'petal') {
  let art = `<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})"><path d="M0 0Q7 -24 0 -47" fill="none" stroke="#6d9f91" stroke-width="3"/>`;
  art += `<path d="M2 -14Q-22 -30 -18 -12Q-8 -4 2 -14M3 -24Q28 -44 24 -24Q15 -16 3 -24" fill="#91bca2"/>`;
  for (let p = 0; p < 5; p++) art += `<ellipse cx="0" cy="-59" rx="9" ry="14" transform="rotate(${p * 72} 0 -46)" fill="url(#${color})"/>`;
  art += circle(0, -46, 7, '#efd392') + circle(-2, -48, 2.5, '#fff5ce');
  return art + '</g>';
}

function meadow() {
  let art = `<rect width="1920" height="1080" fill="url(#day)"/>${circle(1380, 226, 300, 'url(#glow)')}${circle(1380,226,56,'#fff1c7')}`;
  art += cloud(200, 245, .72) + cloud(650, 165, .65) + cloud(1680, 190, .7);
  // Air perspective: distant silhouettes lose contrast and detail.
  art += `<path d="M0 600Q300 420 610 590Q910 400 1230 550Q1620 389 1920 560V1080H0Z" fill="#bdc8cc" opacity=".65"/><path d="M0 660Q390 483 840 670Q1390 480 1920 656V1080H0Z" fill="#b7d3c4"/><path d="M0 735Q600 508 1160 725Q1550 590 1920 667V1080H0Z" fill="url(#hill)"/>`;
  for (const [x,y,s,c] of [[390,730,.52,'lavender'],[1490,696,.55,'mint'],[1685,732,.65,'pink'],[1830,749,.62,'mint']]) art += tree(x,y,s,c);
  art += `<path d="M0 822Q470 742 960 804Q1500 740 1920 818V1080H0Z" fill="url(#ground)"/>`;
  art += `<path d="M1010 750Q1390 688 1660 784Q1940 850 1660 917Q1330 975 1050 884Q907 830 1010 750Z" fill="#e5e4c5"/><path d="M1030 757Q1370 706 1630 791Q1850 850 1620 906Q1335 950 1080 870Q965 828 1030 757Z" fill="url(#water)"/>`;
  for (let i = 0; i < 55; i++) {
    const x = 1100 + random() * 485, y = 785 + random() * 98;
    art += `<path d="M${n(x)} ${n(y)}h${n(10+random()*65)}" stroke="#f7f4e4" stroke-width="${n(1+random()*2)}" opacity="${n(.2+random()*.35)}" stroke-linecap="round"/>`;
  }
  art += tree(134, 890, 1.23, 'pink') + tree(1828, 906, 1.36, 'mint');
  art += `<path d="M0 980Q320 880 620 966Q1060 879 1450 983Q1700 930 1920 964V1080H0Z" fill="#95bda7" opacity=".55"/>`;
  for (let i = 0; i < 570; i++) {
    const x = random() * 1920, y = 780 + random() * 300;
    if (x > 1010 && x < 1700 && y < 933) continue;
    const size = (y - 700) / 240;
    art += `<path d="M${n(x)} ${n(y)}q-5 -${n(8*size)} -${n(4*size)} -${n(13*size)}" fill="none" stroke="${i%2?'#e8ebc2':'#79a89a'}" stroke-width="${n(size)}" opacity=".5"/>`;
    if (i % 5 === 0) art += flower(x, y, size * .45, i % 3 ? 'petal' : 'cloud');
  }
  for (const x of [22,70,142,207,274,1640,1690,1760,1840,1900]) art += flower(x, 1070 + random() * 30, 1.2 + random() * .8, x % 3 ? 'petal' : 'cloud');
  art += `<g fill="none" stroke="#8eaaaa" stroke-width="3" stroke-linecap="round" opacity=".65"><path d="M1060 290q12 -14 24 0q12 -14 24 0M1120 320q8 -10 16 0q8 -10 16 0"/></g>`;
  for (let i=0;i<45;i++) art += circle(random()*1920,450+random()*610,1+random()*2,'#fff5d0',.65);
  return art;
}

for (const [name, draw] of [['dream-sky', sky], ['sunny-meadow', meadow]]) {
  const art = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${defs}<g filter="url(#grain)">${draw()}</g></svg>`;
  fs.writeFileSync(path.join(out, `${name}.svg`), art);
  console.log(`[brand] ${name}.svg (${Math.round(art.length / 1024)} KB)`);
}
