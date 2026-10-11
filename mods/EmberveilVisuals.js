// @name EmberveilVisuals
// @author Foxi005305
// @version 1.0
// @description Цветокоррекция, зум, след и аура игрока, режим скриншота (F7 — меню, H — скрыть интерфейс)
const S = EWMod.store;
if (window.__ewVis) return;
window.__ewVis = 1;

const cfg = Object.assign({ b: 100, c: 100, s: 100, h: 0, sep: 0, gray: 0, rainbow: false, zoom: 0, bright: false, trail: 'off', aura: 'off', shot: false }, S.get('cfg', {}));
const save = () => S.set('cfg', cfg);
const PRESETS = {
  'Обычный': [100, 100, 100, 0, 0, 0], 'Тёплый': [105, 105, 115, -12, 15, 0], 'Холодный': [100, 105, 100, 25, 0, 0],
  'Ч/Б': [100, 110, 0, 0, 0, 100], 'Ретро': [100, 95, 80, 0, 45, 0], 'Неон': [110, 125, 180, 0, 0, 0]
};
const PAL = { fire: ['#ff6a1a', '#ffb83a', '#ffe080'], ice: ['#8ad8ff', '#ffffff', '#bff0ff'], magic: ['#8a3ad8', '#d870ff', '#ffffff'] };
let hueT = 0;

function hex(h) {
  const f = (n) => { const k = (n + h / 30) % 12; const v = 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(v * 255).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}
const color = (kind) => kind === 'rainbow' ? hex(hueT) : PAL[kind][Math.floor(Math.random() * 3)];

function apply() {
  const cv = G.R && G.R.cv; if (!cv) return;
  cv.style.filter = `brightness(${cfg.b}%) contrast(${cfg.c}%) saturate(${cfg.s}%) hue-rotate(${cfg.h + (cfg.rainbow ? hueT : 0)}deg) sepia(${cfg.sep}%) grayscale(${cfg.gray}%)`;
}
function applyZoom() { if (G.R && G.R.cv) { G.settings.zoom = cfg.zoom; G.R.resize(); } }
function applyShot() {
  const v = cfg.shot ? 'hidden' : '';
  for (const id of ['hud', 'touchui', 'onl']) { const e = document.getElementById(id); if (e) e.style.visibility = v; }
  if (G.R && G.R.ov) G.R.ov.style.visibility = v;
}

/* ждём, пока игра создаст холст */
const wait = setInterval(() => {
  if (!(G.R && G.R.cv)) return;
  clearInterval(wait);
  apply(); if (cfg.zoom) applyZoom(); applyShot();
}, 300);

/* постоянный дневной свет (вне подземелий) */
const dl = G.Sys.daylight;
G.Sys.daylight = function () { return (cfg.bright && G.game && !G.game.map.dungeon) ? 1 : dl.apply(this, arguments); };

/* след и аура */
setInterval(() => {
  hueT = (hueT + 5) % 360;
  if (cfg.rainbow) apply();
  const p = G.game && G.game.player;
  if (!p || G.Main.state !== 'play' || !G.R.particle) return;
  if (cfg.trail !== 'off' && p.moving)
    G.R.particle(p.x + (Math.random() - 0.5) * 6, p.y - 2, (Math.random() - 0.5) * 8, -4 - Math.random() * 6, 0.7, color(cfg.trail), 1, { k: 'glow' });
  if (cfg.aura !== 'off')
    for (let i = 0; i < 3; i++) {
      const a = performance.now() / 300 + i * 2.09;
      G.R.particle(p.x + Math.cos(a) * 14, p.y - 10 + Math.sin(a) * 6, 0, -3, 0.45, color(cfg.aura), 1, { k: 'glow' });
    }
}, 60);

/* ---------- меню ---------- */
const mk = (t, txt, css) => { const e = document.createElement(t); if (txt) e.textContent = txt; if (css) e.style.cssText = css; return e; };
const box = mk('div', '', 'position:fixed;top:60px;right:20px;z-index:99990;width:250px;max-height:80vh;overflow:auto;background:#101116;color:#eadfc6;border:1px solid #c9a45c;border-radius:4px;font:12px Georgia,serif;padding:8px 10px;display:none;box-shadow:0 8px 30px #000');
document.body.appendChild(box);
const BTN = 'background:#1d1f26;color:#f1d79a;border:1px solid #8a6a30;border-radius:3px;margin:2px;padding:3px 7px;cursor:pointer;font:inherit';
const slider = (label, key, min, max, step) => {
  const w = mk('label', label, 'display:block;margin-top:4px'), out = mk('b', ' ' + cfg[key], 'color:#f1d79a');
  const r = mk('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = cfg[key]; r.style.width = '100%';
  r.oninput = () => { cfg[key] = +r.value; out.textContent = ' ' + cfg[key]; save(); apply(); };
  w.append(out, r); return w;
};
const check = (label, key, fn) => {
  const w = mk('label', '', 'display:block;margin-top:3px'), c = mk('input'); c.type = 'checkbox'; c.checked = !!cfg[key];
  c.onchange = () => { cfg[key] = c.checked; save(); if (fn) fn(); };
  w.append(c, ' ' + label); return w;
};
const select = (label, key, opts, fn) => {
  const w = mk('label', label + ' ', 'display:block;margin-top:4px'), s = mk('select', '', 'background:#0b0c10;color:#eadfc6;border:1px solid #6a5030');
  for (const [v, n] of opts) s.add(new Option(n, v));
  s.value = String(cfg[key]);
  s.onchange = () => { cfg[key] = isNaN(+s.value) ? s.value : +s.value; save(); if (fn) fn(); };
  w.append(s); return w;
};
const head = (t) => mk('div', t, 'color:#e2c486;border-bottom:1px solid #3a2e16;margin:8px 0 2px');
function render() {
  box.textContent = '';
  box.append(mk('div', '🎨 Visuals', 'color:#f1d79a;font-weight:bold;font-size:14px'), head('Пресеты'));
  for (const n in PRESETS) {
    const b = mk('button', n, BTN);
    b.onclick = () => { [cfg.b, cfg.c, cfg.s, cfg.h, cfg.sep, cfg.gray] = PRESETS[n]; save(); apply(); render(); };
    box.append(b);
  }
  box.append(head('Цвет'), slider('Яркость', 'b', 50, 150, 1), slider('Контраст', 'c', 50, 150, 1), slider('Насыщенность', 's', 0, 200, 1),
    slider('Оттенок', 'h', -180, 180, 1), slider('Сепия', 'sep', 0, 100, 1), slider('Ч/Б', 'gray', 0, 100, 1),
    check('Радуга (меняющийся оттенок)', 'rainbow', apply), check('Всегда светло (кроме подземелий)', 'bright'),
    head('Камера'), select('Зум', 'zoom', [[0, 'Авто'], [2, '2×'], [3, '3×'], [4, '4×'], [5, '5×'], [6, '6×']], applyZoom),
    head('Эффекты игрока'),
    select('След', 'trail', [['off', 'Нет'], ['rainbow', 'Радужный'], ['fire', 'Огонь'], ['ice', 'Лёд'], ['magic', 'Магия']]),
    select('Аура', 'aura', [['off', 'Нет'], ['rainbow', 'Радужная'], ['fire', 'Огонь'], ['ice', 'Лёд'], ['magic', 'Магия']]),
    head('Скриншот'), check('Скрыть интерфейс (H)', 'shot', applyShot));
  const rs = mk('button', 'Сбросить всё', BTN + ';margin-top:8px');
  rs.onclick = () => { Object.assign(cfg, { b: 100, c: 100, s: 100, h: 0, sep: 0, gray: 0, rainbow: false, zoom: 0, bright: false, trail: 'off', aura: 'off', shot: false }); save(); apply(); applyZoom(); applyShot(); render(); };
  box.append(rs);
}
addEventListener('keydown', (e) => {
  if (e.repeat || G.Input.typing()) return;
  if (e.code === 'F7') { e.preventDefault(); box.style.display = box.style.display === 'none' ? 'block' : 'none'; if (box.style.display === 'block') render(); }
  else if (e.code === 'KeyH' && G.Main.state === 'play' && !G.UI.modal()) { cfg.shot = !cfg.shot; save(); applyShot(); if (box.style.display === 'block') render(); }
}, true);
EWMod.log('Visuals загружен — F7');
