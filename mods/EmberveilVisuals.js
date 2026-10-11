// @name EmberveilVisuals
// @author Foxi005305
// @version 2.0
// @description Градиентные ауры и следы, эффекты смерти (луч, молния, лазер), килл-фид с причиной, бинды, новое меню (F7)
if (window.__ewVis2) return;
window.__ewVis2 = 1;
const S = EWMod.store, C = G.Combat, D = G.Data, R = G.R;

/* ---------- конфиг ---------- */
const DEF = {
  b: 100, c: 100, s: 100, h: 0, sep: 0, gray: 0, tint: '#ff7a1a', tintA: 0, bloom: true, bright: false, zoom: 0, shot: false,
  cmode: 'grad', ca: '#ff7a1a', cb: '#ffd84a', speed: 1, aura: 'off', lastAura: 'orbit', auraSize: 1, trail: 'off',
  dfx: true, dtype: 'auto', onlyBoss: false, dsize: 1, ddur: 1, dca: '#ff7a1a', dcb: '#ffe08a', feed: true, feedMs: 5,
  binds: { menu: 'F7', shot: 'KeyH', aura: 'Numpad1', dfx: 'Numpad2', bright: 'Numpad3', preset: 'Numpad4' }
};
const cfg = Object.assign({}, DEF, S.get('cfg2', {}));
cfg.binds = Object.assign({}, DEF.binds, cfg.binds || {});
const save = () => S.set('cfg2', cfg);

/* ---------- цвета ---------- */
const rgb = (h) => { h = String(h).replace('#', ''); const n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = (a) => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
const rgba = (h, a) => { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`; };
const hsl = (h) => { const f = (n) => { const k = (n + h / 30) % 12; return Math.round((0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255); }; return toHex([f(0), f(8), f(4)]); };
const pc = (h) => toHex(rgb(h).map(v => Math.min(255, Math.round(v / 17) * 17)));   // квантование: кэш свечений игры не разрастается
const aurCol = (ph) => { const t = performance.now() / 1000; return cfg.cmode === 'rainbow' ? hsl((t * 60 * cfg.speed + ph * 360) % 360) : mix(cfg.ca, cfg.cb, 0.5 + 0.5 * Math.sin(t * 2 * cfg.speed + ph * 6.283)); };
const dCol = (t) => cfg.cmode === 'rainbow' ? hsl(t * 300) : mix(cfg.dca, cfg.dcb, t);
const seeded = (s) => { s = Math.floor(s) % 2147483646 + 1; return () => { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; };

/* ---------- применение настроек ---------- */
const PRESETS = { 'Обычный': [100, 100, 100, 0, 0, 0], 'Тёплый': [105, 105, 115, -12, 15, 0], 'Холодный': [100, 105, 100, 25, 0, 0], 'Ч/Б': [100, 110, 0, 0, 0, 100], 'Ретро': [100, 95, 80, 0, 45, 0], 'Неон': [110, 125, 180, 0, 0, 0] };
const presetNames = Object.keys(PRESETS);
function apply() {
  const cv = R && R.cv; if (!cv) return;
  const neutral = cfg.b === 100 && cfg.c === 100 && cfg.s === 100 && !cfg.h && !cfg.sep && !cfg.gray;
  cv.style.filter = neutral ? '' : `brightness(${cfg.b}%) contrast(${cfg.c}%) saturate(${cfg.s}%) hue-rotate(${cfg.h}deg) sepia(${cfg.sep}%) grayscale(${cfg.gray}%)`;
}
function applyZoom() { if (R.cv) { G.settings.zoom = cfg.zoom; R.resize(); } }
function applyShot() {
  const v = cfg.shot ? 'hidden' : '';
  for (const id of ['hud', 'touchui', 'onl', 'onchat']) { const e = document.getElementById(id); if (e) e.style.visibility = v; }
  if (R.ov) R.ov.style.visibility = v;
  feed.style.visibility = v;
}
function setPreset(n) { [cfg.b, cfg.c, cfg.s, cfg.h, cfg.sep, cfg.gray] = PRESETS[n]; save(); apply(); }
const dl = G.Sys.daylight;
G.Sys.daylight = function () { return (cfg.bright && G.game && !G.game.map.dungeon) ? 1 : dl.apply(this, arguments); };

/* ---------- причина смерти ---------- */
const CAUSE = { melee: 'ударом', ranged: 'выстрелом', fire: 'огнём', magic: 'магией', blast: 'взрывом', comp: 'спутником', burn: 'горением', other: 'уроном' };
const SK = { power_strike: 'melee', whirlwind: 'melee', piercing_shot: 'ranged', volley: 'ranged', fireball: 'fire', frost_nova: 'magic', heal: 'magic' };
let lastSkill = null;
function causeOf(src, o) {
  o = o || {};
  if (!src) return { k: 'burn' };
  if (src.kind === 'player' && lastSkill && performance.now() - lastSkill.t < 1800) return { k: lastSkill.k, skill: lastSkill.name };
  if (src.kind === 'comp') return { k: 'comp' };
  if (o.type === 'fire') return { k: 'fire' };
  if (o.melee) return { k: 'melee' };
  if (o.spell) return { k: 'magic' };
  if (o.proj) return { k: 'ranged' };
  if ((o.kb || 0) >= 120) return { k: 'blast' };
  return { k: 'other' };
}
const dmg = C.damage;
C.damage = function (src, tgt, amt, o) { if (tgt && tgt.kind === 'enemy') tgt._ewc = causeOf(src, o); return dmg.apply(this, arguments); };
const us = C.useSkill;
C.useSkill = function (p, id) {
  const prev = lastSkill, before = p.cds && p.cds[id], sk = D.skills[id];
  lastSkill = { k: SK[id] || 'magic', name: sk ? sk.name : id, t: performance.now() };
  const r = us.apply(this, arguments);
  if (!(p.cds && p.cds[id] > 0 && p.cds[id] !== before)) lastSkill = prev;
  return r;
};
const die = C.die;
C.die = function (e) {
  const was = e && e.kind === 'enemy' && !e.dead;
  const info = was ? { x: e.x, y: e.y, name: e.name, lvl: e.lvl, boss: !!e.boss, c: e._ewc || { k: 'other' } } : null;
  const r = die.apply(this, arguments);
  if (info && e.dead) onKill(info);
  return r;
};

/* ---------- килл-фид ---------- */
const mk = (t, txt, css) => { const e = document.createElement(t); if (txt) e.textContent = txt; if (css) e.style.cssText = css; return e; };
const feed = mk('div', '', 'position:fixed;right:12px;top:210px;z-index:99980;display:flex;flex-direction:column;gap:5px;align-items:flex-end;pointer-events:none');
document.body.appendChild(feed);
const KC = { melee: '#ff6a4a', ranged: '#ffd84a', fire: '#ff8a2a', magic: '#8ac8ff', blast: '#ffb040', comp: '#7ad87a', burn: '#ff7a3a', other: '#cfc4a8' };
function addFeed(i) {
  if (!cfg.feed) return;
  const col = KC[i.c.k] || KC.other;
  const el = mk('div', '', `min-width:240px;padding:5px 12px 5px 28px;border-radius:6px;border-right:3px solid ${col};background:linear-gradient(90deg,rgba(14,15,19,0),rgba(14,15,19,.92) 22%);font:12px Georgia,serif;color:#eadfc6;text-align:right;transition:opacity .4s;opacity:0;text-shadow:0 1px 2px #000`);
  el.append(mk('b', (i.boss ? '★ ' : '☠ ') + i.name + ' · ур.' + i.lvl, 'color:' + (i.boss ? '#ffd84a' : '#fff')),
    mk('div', 'убит ' + CAUSE[i.c.k] + (i.c.skill ? ' — ' + i.c.skill : ''), 'color:' + col + ';font-size:11px'));
  feed.append(el); requestAnimationFrame(() => { el.style.opacity = 1; });
  while (feed.children.length > 5) feed.firstChild.remove();
  setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 450); }, cfg.feedMs * 1000);
}

/* ---------- эффекты смерти ---------- */
const fx = [], AUTO = { melee: 'beam', ranged: 'laser', fire: 'nova', magic: 'lightning', blast: 'nova', comp: 'soul', burn: 'soul', other: 'beam' };
function onKill(i) {
  addFeed(i);
  if (!cfg.dfx || cfg.dtype === 'off' || (cfg.onlyBoss && !i.boss)) return;
  let type = cfg.dtype;
  if (type === 'random') type = ['beam', 'lightning', 'laser', 'nova', 'soul'][Math.floor(Math.random() * 5)];
  else if (type === 'auto') type = i.boss ? 'beam' : AUTO[i.c.k] || 'beam';
  const p = G.game.player, size = cfg.dsize * (i.boss ? 1.8 : 1);
  if (fx.length > 30) fx.shift();
  fx.push({ type, x: i.x, y: i.y, sx: p.x, sy: p.y, t0: performance.now(), dur: 900 * cfg.ddur * (type === 'laser' ? 0.6 : 1), size, seed: Math.random() * 1e6 });
  if (type === 'soul') for (let n = 0; n < 24; n++) R.particle(i.x + (Math.random() - 0.5) * 10, i.y - 4, (Math.random() - 0.5) * 12, -16 - Math.random() * 30, 1.3, pc(dCol(n / 24)), 1, { k: 'glow' });
  else for (let n = 0; n < 10; n++) { const a = Math.random() * 6.28; R.particle(i.x, i.y - 6, Math.cos(a) * 50, Math.sin(a) * 30 - 10, 0.6, pc(dCol(Math.random())), 1, { k: 'glow' }); }
}
function drawFx(ctx, f, age, ox, oy) {
  const sx = f.x - ox, sy = f.y - oy, a = 1 - age;
  if (f.type === 'beam') {
    const w = f.size * 7 * Math.pow(a, 0.6) + 1, H = 240, g = ctx.createLinearGradient(0, sy - H, 0, sy);
    g.addColorStop(0, rgba(dCol(0), 0)); g.addColorStop(0.4, rgba(dCol(0.4), 0.8 * a)); g.addColorStop(1, rgba(dCol(1), a));
    ctx.fillStyle = g; ctx.fillRect(sx - w / 2, sy - H, w, H);
    ctx.fillStyle = rgba('#ffffff', a); ctx.fillRect(sx - w * 0.17, sy - H * 0.8, w * 0.34, H * 0.8);
    ctx.fillStyle = rgba(dCol(1), 0.5 * a); ctx.beginPath(); ctx.ellipse(sx, sy, w * 2.4, w * 0.9, 0, 0, 6.28); ctx.fill();
  } else if (f.type === 'lightning') {
    const rnd = seeded(f.seed + Math.floor(age * f.dur / 55) * 17);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.moveTo(sx + (k - 1) * 8 * f.size, sy - 170);
      for (let j = 1; j <= 9; j++) ctx.lineTo(j === 9 ? sx : sx + (k - 1) * (1 - j / 9) * 8 * f.size + (rnd() - 0.5) * 16 * f.size, sy - 170 + 170 * j / 9);
      ctx.strokeStyle = rgba(dCol(k / 2), 0.4 * a); ctx.lineWidth = 3 * f.size; ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', a); ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.fillStyle = rgba(dCol(0.5), 0.5 * a); ctx.beginPath(); ctx.arc(sx, sy, 8 * f.size * a + 2, 0, 6.28); ctx.fill();
  } else if (f.type === 'laser') {
    const x0 = f.sx - ox, y0 = f.sy - 8 - oy, y1 = sy - 8, w = (1 + 4 * f.size) * a + 0.5, g = ctx.createLinearGradient(x0, y0, sx, y1);
    g.addColorStop(0, rgba(dCol(0), 0.25 * a)); g.addColorStop(0.5, rgba(dCol(0.5), 0.8 * a)); g.addColorStop(1, rgba(dCol(1), a));
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(sx, y1);
    ctx.strokeStyle = g; ctx.lineWidth = w * 2.4; ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.9 * a); ctx.lineWidth = w * 0.8; ctx.stroke();
    ctx.fillStyle = rgba(dCol(1), a); ctx.beginPath(); ctx.arc(sx, y1, 6 * f.size * a + 2, 0, 6.28); ctx.fill();
  } else if (f.type === 'nova') {
    for (const d of [0, 0.25]) {
      const ag = age - d; if (ag < 0 || ag > 1) continue;
      const rad = ag * 34 * f.size + 2, g = ctx.createLinearGradient(sx - rad, 0, sx + rad, 0);
      g.addColorStop(0, rgba(dCol(0), 1 - ag)); g.addColorStop(1, rgba(dCol(1), 1 - ag));
      ctx.strokeStyle = g; ctx.lineWidth = (1 - ag) * 3 + 1; ctx.beginPath(); ctx.ellipse(sx, sy - 4, rad, rad * 0.6, 0, 0, 6.28); ctx.stroke();
    }
  }
}

/* ---------- аура, след ---------- */
const trail = [];
function drawAura(ctx, p, sx, sy, t) {
  const sz = cfg.auraSize;
  if (cfg.aura === 'orbit') {
    for (let i = 0; i < 6; i++) {
      const ang = t * 2 * cfg.speed + i * 1.047, px = sx + Math.cos(ang) * 14 * sz, py = sy - 10 + Math.sin(ang) * 6 * sz, c = aurCol(i / 6);
      ctx.fillStyle = rgba(c, 0.35); ctx.beginPath(); ctx.arc(px, py, 3.5, 0, 6.28); ctx.fill();
      ctx.fillStyle = rgba(c, 0.95); ctx.fillRect(px - 1, py - 1, 2, 2);
    }
  } else if (cfg.aura === 'ring') {
    let g;
    if (ctx.createConicGradient) {
      g = ctx.createConicGradient(t * cfg.speed, sx, sy);
      if (cfg.cmode === 'rainbow') for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, hsl(i * 60 % 360));
      else { g.addColorStop(0, cfg.ca); g.addColorStop(0.5, cfg.cb); g.addColorStop(1, cfg.ca); }
    } else { g = ctx.createLinearGradient(sx - 16 * sz, 0, sx + 16 * sz, 0); g.addColorStop(0, aurCol(0)); g.addColorStop(1, aurCol(0.5)); }
    ctx.strokeStyle = g;
    ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy, 16 * sz, 6 * sz, 0, 0, 6.28); ctx.stroke();
    ctx.globalAlpha = 0.4; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(sx, sy, 20 * sz, 8 * sz, 0, 0, 6.28); ctx.stroke(); ctx.globalAlpha = 1;
  } else if (cfg.aura === 'spiral') {
    for (let i = 0; i < 26; i++) {
      const u = i / 26, ang = t * 3 * cfg.speed + u * 10;
      ctx.fillStyle = rgba(aurCol(u), 0.9);
      ctx.fillRect(sx + Math.cos(ang) * 10 * sz * (1 - u * 0.3) - 1, sy - u * 34 * sz + Math.sin(ang) * 3, 2, 2);
    }
  }
}
function overlay() {
  const g = G.game; if (!g || G.Main.state !== 'play') return;
  const ctx = R.ctx, ox = R.ox || 0, oy = R.oy || 0, T = performance.now(), t = T / 1000;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (cfg.tintA > 0) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = cfg.tintA / 100; ctx.fillStyle = cfg.tint; ctx.fillRect(0, 0, R.VW, R.VH); ctx.globalAlpha = 1; }
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i], age = (T - f.t0) / f.dur; if (age >= 1) { fx.splice(i, 1); continue; } drawFx(ctx, f, age, ox, oy); }
  const p = g.player;
  if (p && !p.deadT) {
    if (cfg.trail === 'ribbon' && trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const a = 1 - (T - trail[i].t) / 700; if (a <= 0) continue;
        ctx.strokeStyle = rgba(aurCol(i / trail.length), a * 0.8); ctx.lineWidth = 3 * a + 0.5;
        ctx.beginPath(); ctx.moveTo(trail[i - 1].x - ox, trail[i - 1].y - 4 - oy); ctx.lineTo(trail[i].x - ox, trail[i].y - 4 - oy); ctx.stroke();
      }
    }
    drawAura(ctx, p, p.x - ox, p.y - oy, t);
  }
  ctx.restore();
}
let errN = 0;
const drawR = R.draw;
R.draw = function () { const r = drawR.apply(this, arguments); if (errN < 4) { try { overlay(); } catch (e) { errN++; console.error('[Visuals]', e); } } return r; };
setInterval(() => {
  const p = G.game && G.game.player; if (!p || G.Main.state !== 'play') return;
  const T = performance.now();
  if (cfg.trail === 'ribbon') { if (p.moving) trail.push({ x: p.x, y: p.y, t: T }); while (trail.length && T - trail[0].t > 700) trail.shift(); } else trail.length = 0;
  if (cfg.trail === 'grad' && p.moving) R.particle(p.x + (Math.random() - 0.5) * 6, p.y - 2, (Math.random() - 0.5) * 8, -4 - Math.random() * 6, 0.7, pc(aurCol(Math.random())), 1, { k: 'glow' });
  if (cfg.trail === 'sparks' && p.moving) for (let i = 0; i < 2; i++) R.particle(p.x, p.y - 2, (Math.random() - 0.5) * 40, -10 - Math.random() * 20, 0.35, pc(aurCol(Math.random())), 1, { k: 'glow' });
  if (cfg.aura === 'flame' && !p.deadT) for (let i = 0; i < 2; i++) R.particle(p.x + (Math.random() - 0.5) * 8, p.y - 2 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.7, pc(aurCol(Math.random())), 1, { k: 'glow' });
}, 60);

/* ---------- бинды ---------- */
const ACT = {
  menu: ['Открыть меню', () => toggleMenu()],
  shot: ['Скрыть интерфейс (скриншот)', () => { cfg.shot = !cfg.shot; save(); applyShot(); render(); }],
  aura: ['Вкл/выкл ауру', () => { if (cfg.aura === 'off') cfg.aura = cfg.lastAura || 'orbit'; else { cfg.lastAura = cfg.aura; cfg.aura = 'off'; } save(); render(); }],
  dfx: ['Вкл/выкл эффекты смерти', () => { cfg.dfx = !cfg.dfx; save(); render(); }],
  bright: ['Всегда светло', () => { cfg.bright = !cfg.bright; save(); render(); }],
  preset: ['Следующий пресет цвета', () => { cfg.presetI = ((cfg.presetI || 0) + 1) % presetNames.length; setPreset(presetNames[cfg.presetI]); render(); }]
};
let capturing = null;
const keyName = (c) => c ? c.replace('Key', '').replace('Digit', '') : 'Не задан';
addEventListener('keydown', (e) => {
  if (capturing) {
    e.preventDefault(); e.stopPropagation();
    if (e.code === 'Backspace' || e.code === 'Delete') cfg.binds[capturing] = ''; else if (e.code !== 'Escape') cfg.binds[capturing] = e.code;
    capturing = null; save(); render(); return;
  }
  if (e.repeat || G.Input.typing()) return;
  for (const id in ACT) if (cfg.binds[id] && cfg.binds[id] === e.code) { e.preventDefault(); ACT[id][1](); break; }
}, true);

/* ---------- меню ---------- */
const css = document.createElement('style');
css.textContent = `#ewv2{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(780px,96vw);height:min(470px,88vh);z-index:99990;display:none;background:#0e0f13;border:1px solid #23252d;border-radius:16px;box-shadow:0 20px 70px rgba(0,0,0,.85);font:13px 'Segoe UI',Arial,sans-serif;color:#cfd0d6;overflow:hidden}
#ewv2 .side{width:150px;flex:none;background:#0b0c0f;border-right:1px solid #1b1d23;padding:12px 10px;display:flex;flex-direction:column;gap:4px}
#ewv2 .nav{padding:9px 12px;border-radius:10px;cursor:pointer;color:#9a9ca6}
#ewv2 .nav:hover{background:#17181e;color:#fff}#ewv2 .nav.on{background:linear-gradient(180deg,#ff8a2a,#e05a0a);color:#fff}
#ewv2 .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px;overflow:auto;align-content:start}
#ewv2 .card{background:#15171c;border:1px solid #1f2128;border-radius:10px;padding:10px 12px}
#ewv2 select,#ewv2 textarea,#ewv2 .b{background:#0e0f13;color:#e6e6ea;border:1px solid #2a2c35;border-radius:6px;padding:4px 8px;font:inherit}
#ewv2 .b{cursor:pointer}#ewv2 .b:hover{border-color:#f26a14;color:#fff}
#ewv2 input[type=range]{accent-color:#f26a14;width:100%;margin:6px 0 0}
#ewv2 input[type=color]{width:34px;height:22px;border:none;background:none;padding:0;cursor:pointer}
#ewv2 ::-webkit-scrollbar{width:6px}#ewv2 ::-webkit-scrollbar-thumb{background:#f26a14;border-radius:3px}
@media(max-width:620px){#ewv2 .grid{grid-template-columns:1fr}#ewv2 .side{width:96px}}`;
document.head.appendChild(css);
const root = mk('div'); root.id = 'ewv2';
const side = mk('div'); side.className = 'side';
const main = mk('div', '', 'flex:1;display:flex;flex-direction:column;min-width:0');
const hdr = mk('div', '', 'display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #1b1d23;cursor:move;user-select:none');
const search = mk('input'); search.placeholder = 'Поиск…'; search.style.cssText = 'margin-left:auto;width:170px;background:#15171c;color:#e6e6ea;border:1px solid #2a2c35;border-radius:14px;padding:5px 12px;font:inherit';
const closeB = mk('span', '✕', 'cursor:pointer;color:#9a9ca6;padding:0 4px'); closeB.onclick = () => toggleMenu();
hdr.append(mk('b', 'Emberveil Visuals', 'color:#fff;font-size:15px'), search, closeB);
const grid = mk('div'); grid.className = 'grid';
main.append(hdr, grid); root.style.flexDirection = 'row';
const logo = mk('div', '', 'display:flex;align-items:center;gap:8px;margin-bottom:10px');
logo.append(mk('div', 'EV', 'background:linear-gradient(180deg,#ff8a2a,#e05a0a);color:#fff;font-weight:bold;border-radius:8px;padding:5px 7px;font-size:12px'), mk('b', 'Visuals', 'color:#fff'));
side.append(logo); root.append(side, main); document.body.appendChild(root);

const SEL = {
  aura: [['off', 'Нет'], ['orbit', 'Орбита'], ['ring', 'Кольцо'], ['spiral', 'Спираль'], ['flame', 'Пламя']],
  trail: [['off', 'Нет'], ['grad', 'Частицы'], ['sparks', 'Искры'], ['ribbon', 'Лента']],
  dtype: [['auto', 'По причине смерти'], ['beam', 'Луч с неба'], ['lightning', 'Молния'], ['laser', 'Лазер от героя'], ['nova', 'Волна'], ['soul', 'Душа'], ['random', 'Случайный']],
  cmode: [['grad', 'Градиент A→B'], ['rainbow', 'Радуга']],
  zoom: [[0, 'Авто'], [2, '2×'], [3, '3×'], [4, '4×'], [5, '5×'], [6, '6×']]
};
const rg = (k, l, min, max, step, fn) => ({ t: 'range', k, l, min, max, step, fn: fn || apply });
const TABS = {
  '🎨 Визуалы': [
    { t: 'preset', l: 'Пресет цвета', d: 'Готовые цветовые схемы' },
    rg('b', 'Яркость', 50, 150, 1), rg('c', 'Контраст', 50, 150, 1), rg('s', 'Насыщенность', 0, 200, 1), rg('h', 'Оттенок', -180, 180, 1), rg('sep', 'Сепия', 0, 100, 1), rg('gray', 'Ч/Б', 0, 100, 1),
    { t: 'color', k: 'tint', l: 'Цвет подсветки' }, rg('tintA', 'Сила подсветки', 0, 60, 1, () => { }),
    { t: 'check', k: 'bright', l: 'Всегда светло', d: 'Ночью и в дождь не темнеет (не в подземельях)' },
    { t: 'check', k: 'bloom', l: 'Свечение (bloom)', d: 'Свет от огней и источников', fn: () => { G.settings.bloom = cfg.bloom; } },
    { t: 'select', k: 'zoom', l: 'Зум', o: SEL.zoom, fn: applyZoom },
    { t: 'check', k: 'shot', l: 'Режим скриншота', d: 'Скрыть интерфейс', fn: applyShot }],
  '✨ Аура': [
    { t: 'select', k: 'cmode', l: 'Режим цвета', o: SEL.cmode }, { t: 'color', k: 'ca', l: 'Цвет A' }, { t: 'color', k: 'cb', l: 'Цвет B' }, rg('speed', 'Скорость градиента', 0.2, 4, 0.1, () => { }),
    { t: 'select', k: 'aura', l: 'Аура', o: SEL.aura }, rg('auraSize', 'Размер ауры', 0.5, 2, 0.1, () => { }), { t: 'select', k: 'trail', l: 'След при ходьбе', o: SEL.trail }],
  '☠ Смерть': [
    { t: 'check', k: 'dfx', l: 'Эффект смерти врага' }, { t: 'select', k: 'dtype', l: 'Тип эффекта', o: SEL.dtype },
    { t: 'check', k: 'onlyBoss', l: 'Только для боссов' }, { t: 'color', k: 'dca', l: 'Цвет эффекта A' }, { t: 'color', k: 'dcb', l: 'Цвет эффекта B' },
    rg('dsize', 'Размер', 0.5, 3, 0.1, () => { }), rg('ddur', 'Длительность', 0.5, 3, 0.1, () => { }),
    { t: 'check', k: 'feed', l: 'Килл-фид', d: 'Полоса «убит ударом / молнией / огнём…»' }, rg('feedMs', 'Время показа фида, с', 2, 12, 1, () => { }),
    { t: 'btn', b: 'Тест эффекта', l: 'Проверка', run: () => { const p = G.game.player; onKill({ x: p.x + 50, y: p.y, name: 'Тестовый враг', lvl: 5, boss: false, c: { k: 'magic', skill: 'Тест' } }); } }],
  '⌨ Бинды': Object.keys(ACT).map(id => ({ t: 'bind', id, l: ACT[id][0] })),
  '⚙ Конфиг': [
    { t: 'btn', b: 'Копировать конфиг', l: 'Экспорт', run: () => navigator.clipboard.writeText(JSON.stringify(cfg)) },
    { t: 'area', l: 'Импорт конфига' },
    { t: 'btn', b: 'Сбросить всё', l: 'Сброс', run: () => { Object.assign(cfg, JSON.parse(JSON.stringify(DEF))); save(); apply(); applyZoom(); applyShot(); render(); } }]
};
let cur = '🎨 Визуалы';
for (const n in TABS) { const b = mk('div', n); b.className = 'nav'; b.onclick = () => { cur = n; search.value = ''; render(); }; side.append(b); }

function control(s) {
  const k = s.k;
  if (s.t === 'check') {
    const sw = mk('div', '', 'width:34px;height:18px;border-radius:9px;position:relative;cursor:pointer;flex:none;transition:background .15s');
    const kn = mk('div', '', 'position:absolute;top:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .15s'); sw.append(kn);
    const paint = () => { sw.style.background = cfg[k] ? '#f26a14' : '#2a2c35'; kn.style.left = cfg[k] ? '18px' : '2px'; };
    paint(); sw.onclick = () => { cfg[k] = !cfg[k]; save(); paint(); if (s.fn) s.fn(); }; return sw;
  }
  if (s.t === 'select') {
    const el = mk('select'); for (const [v, n] of s.o) el.add(new Option(n, v)); el.value = String(cfg[k]);
    el.onchange = () => { cfg[k] = isNaN(+el.value) ? el.value : +el.value; save(); if (s.fn) s.fn(); }; return el;
  }
  if (s.t === 'preset') {
    const el = mk('select'); el.add(new Option('—', '')); for (const n of presetNames) el.add(new Option(n, n));
    el.onchange = () => { if (el.value) { setPreset(el.value); render(); } }; return el;
  }
  if (s.t === 'color') { const el = mk('input'); el.type = 'color'; el.value = cfg[k]; el.oninput = () => { cfg[k] = el.value; save(); if (s.fn) s.fn(); }; return el; }
  if (s.t === 'btn') { const el = mk('button', s.b); el.className = 'b'; el.onclick = () => { try { s.run(); } catch (e) { console.error(e); } }; return el; }
  if (s.t === 'bind') {
    const el = mk('button', keyName(cfg.binds[s.id])); el.className = 'b';
    el.onclick = () => { capturing = s.id; el.textContent = 'Нажмите клавишу…'; }; return el;
  }
  return mk('span');
}
function row(s) {
  const card = mk('div'); card.className = 'card';
  if (s.t === 'area') {
    card.style.gridColumn = '1/-1';
    const ta = mk('textarea'); ta.style.cssText = 'width:100%;height:70px;margin-top:6px;box-sizing:border-box;font:11px monospace'; ta.placeholder = 'Вставьте JSON-конфиг и нажмите «Импорт»';
    const b = mk('button', 'Импорт'); b.className = 'b'; b.style.marginTop = '6px';
    b.onclick = () => {
      try {
        const o = JSON.parse(ta.value);
        for (const k in DEF) if (k in o && typeof o[k] === typeof DEF[k]) cfg[k] = k === 'binds' ? Object.assign({}, DEF.binds, o[k]) : o[k];
        save(); apply(); applyZoom(); applyShot(); render();
      } catch (e) { ta.value = 'Ошибка: ' + e.message; }
    };
    card.append(mk('b', s.l, 'color:#f0e8d8'), ta, b); return card;
  }
  const top = mk('div', '', 'display:flex;justify-content:space-between;align-items:center;gap:8px');
  const lab = mk('b', s.l, 'color:#f0e8d8;font-weight:600'), out = mk('span', '', 'color:#f26a14;margin-left:6px');
  lab.append(out);
  if (s.t === 'range') {
    out.textContent = cfg[s.k]; top.append(lab); card.append(top);
    const r = mk('input'); r.type = 'range'; r.min = s.min; r.max = s.max; r.step = s.step; r.value = cfg[s.k];
    r.oninput = () => { cfg[s.k] = +r.value; out.textContent = cfg[s.k]; save(); s.fn(); }; card.append(r); return card;
  }
  top.append(lab, control(s)); card.append(top);
  if (s.d) card.append(mk('div', s.d, 'color:#80838d;font-size:11px;margin-top:4px'));
  return card;
}
function render() {
  const q = search.value.trim().toLowerCase();
  for (const n of side.querySelectorAll('.nav')) n.classList.toggle('on', !q && n.textContent === cur);
  grid.textContent = '';
  const list = q ? Object.values(TABS).flat().filter(s => (s.l + ' ' + (s.d || '')).toLowerCase().includes(q)) : TABS[cur];
  if (!list.length) grid.append(mk('div', 'Ничего не найдено', 'color:#80838d'));
  for (const s of list) grid.append(row(s));
}
search.oninput = render;
function toggleMenu() { root.style.display = root.style.display === 'flex' ? 'none' : 'flex'; if (root.style.display === 'flex') render(); }
(() => {
  let dx, dy, drag = false;
  hdr.onmousedown = (e) => { if (e.target === search) return; const r = root.getBoundingClientRect(); root.style.transform = 'none'; root.style.left = r.left + 'px'; root.style.top = r.top + 'px'; dx = e.clientX - r.left; dy = e.clientY - r.top; drag = true; };
  addEventListener('mousemove', (e) => { if (drag) { root.style.left = (e.clientX - dx) + 'px'; root.style.top = (e.clientY - dy) + 'px'; } });
  addEventListener('mouseup', () => { drag = false; });
})();

const wait = setInterval(() => { if (R.cv) { clearInterval(wait); apply(); if (cfg.zoom) applyZoom(); applyShot(); } }, 300);
EWMod.log('Visuals 2.0 загружен — F7');
