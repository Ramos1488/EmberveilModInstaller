// @name Voice Chat
// @author Foxi005305
// @version 1.0
// @description Голосовой чат по близости для онлайн-режима (WebRTC, G — говорить)
const O = G.Online;
if (!O) { EWMod.toast('Voice Chat: онлайн-модуль не найден'); return; }
const S = EWMod.store;
const cfg = { radius: S.get('radius', 400), vol: S.get('vol', 1), mode: S.get('mode', 'ptt') };
const clean = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '_');
const pid = (rid) => 'ewvc-' + clean(O.room) + '-' + clean(rid);

let peer = null, stream = null, ctx = null, talking = false, busy = false, err = '';
const calls = new Map();   // rid -> {call, gain, an, buf, el}
const tried = new Map();   // rid -> time of last call attempt

/* ---------- UI ---------- */
const $ = (t, txt, css) => { const e = document.createElement(t); if (txt) e.textContent = txt; if (css) e.style.cssText = css; return e; };
const box = $('div', '', 'position:fixed;left:10px;bottom:56px;z-index:99990;background:#101116;color:#eadfc6;border:1px solid #c9a45c;border-radius:4px;font:12px Georgia,serif;padding:6px 8px;width:210px;display:none');
const head = $('div', '🎤 Голосовой чат', 'color:#f1d79a;font-weight:bold;margin-bottom:4px');
const startBtn = $('button', 'Включить', 'width:100%;cursor:pointer;background:#1d1f26;color:#f1d79a;border:1px solid #8a6a30;border-radius:3px;padding:3px');
const stat = $('div', '', 'margin:4px 0;color:#9fd89a');
const modeSel = $('select', '', 'width:100%;background:#0b0c10;color:#eadfc6;border:1px solid #6a5030');
modeSel.add(new Option('Удерживать G', 'ptt')); modeSel.add(new Option('Открытый микрофон', 'open'));
modeSel.value = cfg.mode;
const mkRange = (label, min, max, step, val, on) => {
  const w = $('label', label, 'display:block;margin-top:3px'); const r = $('input'); r.type = 'range';
  r.min = min; r.max = max; r.step = step; r.value = val; r.style.width = '100%'; r.oninput = () => on(+r.value); w.append(r); return w;
};
const rad = mkRange('Радиус', 150, 800, 25, cfg.radius, (v) => { cfg.radius = v; S.set('radius', v); });
const vol = mkRange('Громкость', 0, 2, 0.1, cfg.vol, (v) => { cfg.vol = v; S.set('vol', v); });
const list = $('div', '', 'margin-top:5px');
box.append(head, startBtn, stat, modeSel, rad, vol, list);
document.body.appendChild(box);

/* ---------- микрофон / peer ---------- */
function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = ok; s.onerror = () => no(new Error('PeerJS не загрузился (блок CSP/сети?)'));
    document.head.appendChild(s);
  });
}
function setMic() {
  if (!stream) return;
  const on = cfg.mode === 'open' || talking;
  stream.getAudioTracks().forEach((t) => { t.enabled = on; });
}
async function start() {
  if (busy || peer) return;
  busy = true; err = ''; render();
  try {
    if (!O.on) throw new Error('Войдите в онлайн-мир');
    await loadPeerJS();
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    setMic();
    peer = new Peer(pid(O.me));
    peer.on('call', (c) => { c.answer(stream); attach(c, c.peer); });
    peer.on('error', (e) => { err = e.type === 'unavailable-id' ? 'Уже открыто в другой вкладке' : e.type; if (e.type === 'unavailable-id') stop(); render(); });
  } catch (e) { err = e.message; stop(); }
  busy = false; render();
}
function stop() {
  for (const rid of [...calls.keys()]) drop(rid);
  if (peer) { try { peer.destroy(); } catch (e) { /* ignore */ } peer = null; }
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  if (ctx) { try { ctx.close(); } catch (e) { /* ignore */ } ctx = null; }
  talking = false;
}
function ridOf(peerId) { return peerId.slice(('ewvc-' + clean(O.room) + '-').length); }
function attach(call, peerId) {
  const rid = ridOf(peerId);
  if (calls.has(rid)) { try { call.close(); } catch (e) { /* ignore */ } return; }
  const rec = { call };
  calls.set(rid, rec);
  call.on('stream', (rs) => {
    rec.el = new Audio(); rec.el.srcObject = rs; rec.el.muted = true; rec.el.play().catch(() => {});
    const src = ctx.createMediaStreamSource(rs);
    rec.gain = ctx.createGain(); rec.gain.gain.value = 0;
    rec.an = ctx.createAnalyser(); rec.an.fftSize = 256; rec.buf = new Uint8Array(rec.an.frequencyBinCount);
    src.connect(rec.gain); rec.gain.connect(ctx.destination); src.connect(rec.an);
  });
  call.on('close', () => drop(rid));
  call.on('error', () => drop(rid));
}
function drop(rid) {
  const r = calls.get(rid); if (!r) return;
  calls.delete(rid);
  try { r.call.close(); } catch (e) { /* ignore */ }
  if (r.el) r.el.srcObject = null;
}

/* ---------- близость ---------- */
const dist = (e) => { const p = G.game && G.game.player; return p ? Math.hypot(e.x - p.x, e.y - p.y) : 1e9; };
setInterval(() => {
  if (!peer) return;
  if (!O.on) { stop(); render(); return; }
  const near = new Map();
  for (const e of O.list) if (e.rid != null && dist(e) < cfg.radius * 1.3) near.set(String(e.rid), e);
  for (const [rid, e] of near) {
    if (calls.has(rid) || !peer.open) continue;
    if (String(O.me) < rid && Date.now() - (tried.get(rid) || 0) > 4000) {   // звонит тот, у кого ID меньше
      tried.set(rid, Date.now());
      attach(peer.call(pid(rid), stream), pid(rid));
    }
  }
  for (const rid of [...calls.keys()]) {
    const e = near.get(rid) || O.remotes.get(rid);
    if (!e || e.mapId !== G.game.map.id || dist(e) > cfg.radius * 1.6) drop(rid);
  }
}, 700);
setInterval(() => {
  for (const [rid, r] of calls) {
    const e = O.remotes.get(rid); if (!r.gain || !e) continue;
    const k = Math.max(0, 1 - dist(e) / cfg.radius);
    r.gain.gain.setTargetAtTime(k * k * cfg.vol, ctx.currentTime, 0.1);
  }
}, 100);

/* ---------- управление ---------- */
const keyOk = (e) => e.code === 'KeyG' && !G.Input.typing() && G.Main.state === 'play';
addEventListener('keydown', (e) => { if (keyOk(e) && !e.repeat && cfg.mode === 'ptt') { talking = true; setMic(); render(); } }, true);
addEventListener('keyup', (e) => { if (e.code === 'KeyG' && talking) { talking = false; setMic(); render(); } }, true);
modeSel.onchange = () => { cfg.mode = modeSel.value; S.set('mode', cfg.mode); setMic(); render(); };
startBtn.onclick = () => { startBtn.blur(); if (peer) { stop(); render(); } else start(); };
addEventListener('pagehide', stop);

function render() {
  box.style.display = O.on ? 'block' : 'none';
  startBtn.textContent = busy ? 'Подключение…' : peer ? 'Выключить' : 'Включить';
  const mic = !peer ? '' : (cfg.mode === 'open' || talking) ? '🎙 микрофон включён' : '🔇 удерживайте G';
  stat.style.color = err ? '#ff8f7a' : '#9fd89a';
  stat.textContent = err || mic;
  list.textContent = '';
  for (const [rid, r] of calls) {
    const e = O.remotes.get(rid), row = $('div', (e ? e.name : rid), 'display:flex;justify-content:space-between');
    const bar = $('span', '', 'display:inline-block;width:40px;height:6px;background:#222;align-self:center');
    const lvl = $('i', '', 'display:block;height:6px;background:#5ad85a;width:0');
    bar.append(lvl); row.append(bar); list.append(row); r.lvl = lvl;
  }
}
setInterval(render, 1500);
setInterval(() => {
  for (const r of calls.values()) {
    if (!r.an || !r.lvl) continue;
    r.an.getByteTimeDomainData(r.buf);
    let m = 0; for (const v of r.buf) m = Math.max(m, Math.abs(v - 128));
    r.lvl.style.width = Math.min(100, m * 2.5) + '%';
  }
}, 120);
render();
EWMod.log('Voice Chat загружен');
