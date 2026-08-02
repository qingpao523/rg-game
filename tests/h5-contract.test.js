// H5 契约测试：客户端 config.js 与服务端默认技能/静态路径安全必须保持一致
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadClientConfig() {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8'), ctx, { filename: 'config.js' });
  return JSON.parse(JSON.stringify(vm.runInContext('CONFIG', ctx)));
}

test('服务端默认技能与客户端 config.js 完全一致（防 atk/atkMult 类漂移）', () => {
  const { SkillDB } = require(path.join(ROOT, 'server', 'db.js'));
  const client = loadClientConfig().skills;
  const server = SkillDB._defaultSkills();
  for (const id of Object.keys(client)) {
    assert.ok(server[id], `服务端缺少默认技能: ${id}`);
    assert.deepStrictEqual(server[id].levels, client[id].levels, `技能数值漂移: ${id}`);
    assert.strictEqual(server[id].behavior, client[id].behavior, `技能行为漂移: ${id}`);
    assert.strictEqual(server[id].name, client[id].name, `技能名漂移: ${id}`);
    assert.strictEqual(server[id].icon, client[id].icon, `技能图标漂移: ${id}`);
  }
  for (const id of Object.keys(server)) {
    assert.ok(client[id], `服务端存在客户端未实现的技能: ${id}`);
  }
});

test('safeJoin 阻止路径穿越与点目录', () => {
  const { safeJoin, relFromPathname } = require(path.join(ROOT, 'server', 'safe-path.js'));
  assert.strictEqual(safeJoin('/a/b', 'assets/x.png'), '/a/b/assets/x.png');
  assert.strictEqual(safeJoin('/a/b', 'js/../../server/data/players.json'), null);
  assert.strictEqual(safeJoin('/a/b', '../x'), null);
  assert.strictEqual(safeJoin('/a/b', '.git/config'), null);
  assert.strictEqual(safeJoin('/a/b', 'a/../b.png'), '/a/b/b.png'); // 无害的段内归一化仍允许
  // 先 normalize 会把绝对路径的 .. 折叠进根内（历史漏洞），relFromPathname 必须先剥前导斜杠
  assert.strictEqual(relFromPathname('/js/..%2f..%2fserver%2fdata%2fplayers.json'), '../server/data/players.json');
  assert.strictEqual(safeJoin('/a/b', relFromPathname('/js/..%2f..%2fserver%2fdata%2fplayers.json')), null);
  assert.strictEqual(safeJoin('/a/b', relFromPathname('/js/../assets/x.png')), '/a/b/assets/x.png');
});

test('敌人校验器拒绝未知字段与非法数值', () => {
  const { validateEnemy } = require(path.join(ROOT, 'server', 'admin', 'config-schema.js'));
  assert.deepStrictEqual(validateEnemy({ hp: 20, speed: 85, img: 'enemies/x.png' }), []);
  assert.ok(validateEnemy({ hp: 'abc' }).length > 0);
  assert.ok(validateEnemy({ hp: -1 }).length > 0);
  assert.ok(validateEnemy({ evilField: 1 }).length > 0);
  assert.ok(validateEnemy({ tags: 'not-array' }).length > 0);
});

test('客户端登录路径与服务端路由一致（防 /api/auth 404）', () => {
  const serverSrc = fs.readFileSync(path.join(ROOT, 'server', 'index.js'), 'utf8');
  const clientSrc = fs.readFileSync(path.join(ROOT, 'js', 'storage.js'), 'utf8');
  assert.ok(serverSrc.includes("route('POST', '/api/auth'"), '服务端缺少 /api/auth 路由');
  assert.ok(serverSrc.includes("route('POST', '/api/auth/login'"), '服务端缺少旧路径别名');
  assert.ok(clientSrc.includes("'/api/auth'"), '客户端未使用 /api/auth');
  assert.ok(!clientSrc.includes("'/api/auth/login'"), '客户端不应再调用旧路径');
  assert.ok(serverSrc.includes('{ token, playerId'), '服务端登录响应应包含 token');
});

test('对话上下文水位自动清理（接近阈值丢旧消息）', () => {
  const { manageChatContext } = require(path.join(ROOT, 'server', 'chat-context.js'));
  const sys = 'x'.repeat(30000); // 系统提示词约 15000 token
  const history = Array.from({ length: 20 }, (_, i) => ({ role: 'user', content: '哈'.repeat(7000) + i }));
  const { history: out, contextReset } = manageChatContext(sys, history, 64000, 0.7);
  assert.ok(contextReset, '接近阈值应触发清理');
  assert.ok(out.length < history.length, '应丢弃部分旧消息');
  assert.ok(out.length >= 1, '至少保留最近一条消息');
  const totalTokens = 15000 + out.reduce((s, m) => s + Math.ceil(m.content.length / 2), 0);
  assert.ok(totalTokens <= Math.floor(64000 * 0.45) + 15000, '清理后应回到安全水位');
});
