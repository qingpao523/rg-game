// 静态文件安全拼接：目标必须落在 root 内，且不允许任何 .. / 点开头路径段
const path = require('path');

function safeJoin(root, rel) {
  const rootResolved = path.resolve(root);
  const full = path.resolve(rootResolved, rel);
  if (full !== rootResolved && !full.startsWith(rootResolved + path.sep)) return null;
  const segs = full.slice(rootResolved.length).split(path.sep).filter(Boolean);
  for (const seg of segs) {
    if (seg === '..' || seg.startsWith('.')) return null;
  }
  return full;
}

// 把 URL pathname 转成相对路径：先剥前导斜杠再 normalize。
// 顺序不能反——先 normalize 时绝对路径会把 .. 在根处折叠成根内路径，绕过穿越检查。
function relFromPathname(pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return null; }
  return path.normalize(rel.replace(/^[/\\]+/, ''));
}

module.exports = { safeJoin, relFromPathname };
