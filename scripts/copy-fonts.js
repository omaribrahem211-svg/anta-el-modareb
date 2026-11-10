// ينسخ خط Changa من node_modules لفولدر www/fonts عشان اللعبة تشتغل من غير إنترنت
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'node_modules', '@fontsource', 'changa', 'files');
const out = path.join(__dirname, '..', 'www', 'fonts');
if (!fs.existsSync(src)) { console.error('مش لاقي @fontsource/changa — شغّل npm install الأول'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const ranges = {
  arabic: 'U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC',
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
};
let css = '', n = 0;
for (const f of fs.readdirSync(src)) {
  const m = f.match(/^changa-(arabic|latin)-(\d{3})-normal\.woff2$/);
  if (!m || !['400', '500', '600', '700', '800'].includes(m[2])) continue;
  fs.copyFileSync(path.join(src, f), path.join(out, f));
  css += `@font-face{font-family:'Changa';font-style:normal;font-weight:${m[2]};font-display:swap;src:url('${f}') format('woff2');unicode-range:${ranges[m[1]]};}\n`;
  n++;
}
fs.writeFileSync(path.join(out, 'changa.css'), css);
console.log(`اتنسخ ${n} ملف خط إلى www/fonts`);
