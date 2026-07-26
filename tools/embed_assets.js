#!/usr/bin/env node
// 把战斗关键资源打包为 base64 内嵌到 js/assets-data.js。
// 内嵌资源随代码一起加载，不依赖逐张图片的网络请求 —— 从根本上解决远程环境
// 图片 404/加载失败导致的黑屏（背景/人物/怪物加载不出来）。
// 用法：node tools/embed_assets.js  （资源变更后重新运行并提交 js/assets-data.js）
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'js', 'assets-data.js');

// 清单：代码中引用的资源路径 → { file: 实际文件(相对 rg-h5)，mime }
// 背景用压缩后的 JPEG（1.5MB PNG → 128KB JPEG），其余保留 PNG（含透明度）
const manifest = {
  'maps/broken_dragon_palace_bg.png': { file: 'tools/embed-src/broken_dragon_palace_bg.jpg', mime: 'image/jpeg' },
  'maps/black_fog_edge_overlay.png': { file: 'assets/maps/black_fog_edge_overlay.png', mime: 'image/png' },
};

// 全部职业精灵（idle + move）
for (const cid of ['taoist', 'samurai', 'pharaoh', 'ice_witch', 'crusader']) {
  for (const kind of ['idle', 'move']) {
    const p = `characters/${cid}_${kind}.png`;
    manifest[p] = { file: 'assets/' + p, mime: 'image/png' };
  }
}
// 全部怪物精灵（战斗实际引用的）
for (const p of ['enemies/grunt_move.png', 'enemies/charger_move.png', 'enemies/charger_charge.png', 'enemies/elite_move.png', 'enemies/goblin_run.png']) {
  manifest[p] = { file: 'assets/' + p, mime: 'image/png' };
}

const out = {};
let totalRaw = 0, totalB64 = 0;
const missing = [];
for (const [codePath, { file, mime }] of Object.entries(manifest)) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) { missing.push(file); continue; }
  const buf = fs.readFileSync(fp);
  totalRaw += buf.length;
  const b64 = buf.toString('base64');
  totalB64 += b64.length;
  out[codePath] = `data:${mime};base64,${b64}`;
}

if (missing.length) {
  console.error('缺失文件：\n  ' + missing.join('\n  '));
  process.exit(1);
}

const header = `// 自动生成（node tools/embed_assets.js），请勿手改。
// 战斗关键资源的 base64 内嵌：随代码加载，远程不再依赖逐张图片网络请求。
// 共 ${Object.keys(out).length} 个资源，原始 ${(totalRaw / 1024).toFixed(0)}KB，base64 ${(totalB64 / 1024).toFixed(0)}KB。
window.ASSETS_EMBED = `;

fs.writeFileSync(OUT, header + JSON.stringify(out) + ';\n');
console.log(`已生成 ${path.relative(ROOT, OUT)}：${Object.keys(out).length} 个资源，原始 ${(totalRaw / 1024).toFixed(0)}KB，base64 ${(totalB64 / 1024).toFixed(0)}KB，文件 ${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`);
