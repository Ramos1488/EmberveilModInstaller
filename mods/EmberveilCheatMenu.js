// ==UserScript==
// @name         Emberveil Cheat Menu
// @namespace    http://tampermonkey.net/
// @version      2026-10-10
// @description  Обновленное чит-меню с новым UI, анимациями, языками, новыми предметами, боссами и синхронизацией для серверов!
// @author       Foxi005305
// @match        https://emberveil.vercel.app/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vercel.app
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
 if (window.__ewCheats) return;

  /* Публичный ключ владельца (JSON). Сгенерируйте во вкладке Admin и вставьте сюда, например:
     const OWNER_PUB = '{"kty":"EC","crv":"P-256","x":"...","y":"..."}'; */
  const OWNER_PUB = '';

  let tries = 0;
  const iv = setInterval(() => {
    const G = window.G;
    if (G && G.Main && G.Combat && G.Ent && G.Sys && G.Data && G.UI && G.R && G.Input && G.Accounts) {
      clearInterval(iv);
      try { init(G); } catch (e) { console.error('[Cheats]', e); alert('Cheats error: ' + e.message); }
    } else if (++tries > 100) clearInterval(iv);
  }, 300);

  function init(G) {
    window.__ewCheats = 1;
    console.log('[Cheats] v3 loaded — Right Shift');
    const C = G.Combat, E = G.Ent, D = G.Data, Sys = G.Sys, O = G.Online;
    const g = () => G.game, P = () => G.game && G.game.player;
    const LS = {
      get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
      del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
    };

    /* ================= state ================= */
    const st = {
      god: false, partyGod: false, inf: false, onehit: false, nocd: false, fastAtk: false, crit: false,
      parry: false, aura: false, auraR: 150, freezeFoes: false, dmg: 1, xpMul: 1,
      noclip: false, water: false, magnet: false, instant: false, speed: 1,
      freezeTime: null, bright: false, weatherLock: false, richShops: false, timeSpeed: 2,
      blockLB: true, cheated: false, broadcast: true, showTags: true
    };
    const used = () => { st.cheated = true; };

    /* ================= roles & crypto ================= */
    const ROLES = {
      none: { n: 'Нет роли', lvl: 0, c: '#999' }, user: { n: 'USER', lvl: 1, c: '#9ad8ff' },
      vip: { n: 'VIP', lvl: 2, c: '#ffd040' }, admin: { n: 'ADMIN', lvl: 3, c: '#ff8a5a' },
      owner: { n: 'OWNER', lvl: 4, c: '#ff5a7a' }
    };
    const enc = new TextEncoder(), dec = new TextDecoder();
    const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const unb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
    const subtle = window.crypto && crypto.subtle;
    const ALG = { name: 'ECDSA', namedCurve: 'P-256' }, SIG = { name: 'ECDSA', hash: 'SHA-256' };
    const getPub = () => OWNER_PUB || LS.get('ewc_pub') || '';
    const getPriv = () => LS.get('ewc_priv') || '';
    let pubKeyCache = null, pubKeyStr = '';
    async function pubKey() {
      const s = getPub(); if (!s || !subtle) return null;
      if (pubKeyCache && pubKeyStr === s) return pubKeyCache;
      pubKeyCache = await subtle.importKey('jwk', JSON.parse(s), ALG, false, ['verify']); pubKeyStr = s; return pubKeyCache;
    }
    async function genKeys() {
      if (!subtle) throw new Error('crypto.subtle недоступен (нужен https или localhost)');
      const kp = await subtle.generateKey(ALG, true, ['sign', 'verify']);
      const pr = await subtle.exportKey('jwk', kp.privateKey), pb = await subtle.exportKey('jwk', kp.publicKey);
      LS.set('ewc_priv', JSON.stringify(pr));
      LS.set('ewc_pub', JSON.stringify({ kty: pb.kty, crv: pb.crv, x: pb.x, y: pb.y }));
      pubKeyCache = null;
    }
    async function signToken(login, role, days) {
      const pr = getPriv(); if (!pr) throw new Error('Нет приватного ключа');
      const key = await subtle.importKey('jwk', JSON.parse(pr), ALG, false, ['sign']);
      const payload = { u: String(login).trim().toLowerCase(), r: role, i: Date.now(), x: days > 0 ? Date.now() + days * 864e5 : 0 };
      const pb = enc.encode(JSON.stringify(payload));
      const sig = await subtle.sign(SIG, key, pb);
      return b64u(pb) + '.' + b64u(sig);
    }
    const vcache = new Map();
    async function verifyToken(tok, login) {
      try {
        const k = tok + '|' + String(login).toLowerCase();
        if (vcache.has(k)) return vcache.get(k);
        const key = await pubKey(); if (!key) return { ok: false, err: 'Нет публичного ключа' };
        const [p, s] = String(tok).trim().split('.'); if (!p || !s) return { ok: false, err: 'Неверный формат токена' };
        const pb = unb64u(p);
        if (!(await subtle.verify(SIG, key, unb64u(s), pb))) return { ok: false, err: 'Подпись недействительна' };
        const pl = JSON.parse(dec.decode(pb));
        let r;
        if (!ROLES[pl.r] || pl.r === 'none') r = { ok: false, err: 'Неизвестная роль' };
        else if (pl.x && Date.now() > pl.x) r = { ok: false, err: 'Срок токена истёк' };
        else if (pl.u !== String(login).toLowerCase()) r = { ok: false, err: 'Токен выдан для «' + pl.u + '»' };
        else r = { ok: true, role: pl.r, login: pl.u, exp: pl.x };
        vcache.set(k, r); return r;
      } catch (e) { return { ok: false, err: 'Ошибка проверки: ' + e.message }; }
    }

    /* my own identity */
    const myLogin = () => (G.Accounts.user ? String(G.Accounts.user).toLowerCase() : '');
    let me = { login: '', role: 'none', token: '', err: '' };
    async function refreshMe() {
      const login = myLogin();
      me.login = login; me.err = '';
      if (!login) { me.role = 'none'; me.token = ''; return; }
      if (getPriv() && subtle) {            // владелец: подписываем себе роль owner
        try { me.token = await signToken(login, 'owner', 0); me.role = 'owner'; return; } catch (e) { me.err = e.message; }
      }
      const t = LS.get('ewc_tok_' + login) || '';
      me.token = t;
      if (!t) { me.role = 'none'; return; }
      const r = await verifyToken(t, login);
      me.role = r.ok ? r.role : 'none'; me.err = r.ok ? '' : r.err;
    }
    const level = () => (!getPub() ? 4 : ROLES[me.role].lvl);
    let lastLogin = null;
    setInterval(async () => {
      if (myLogin() !== lastLogin) { lastLogin = myLogin(); await refreshMe(); if (root.classList.contains('on')) render(); }
    }, 2000);

    /* ================= hooks ================= */
    const dmg = C.damage;
    C.damage = function (src, tgt, amt, o) {
      if (tgt && st.god && tgt.kind === 'player') return 0;
      if (tgt && st.partyGod && tgt.kind === 'comp') return 0;
      if (src && src.kind === 'player' && tgt && tgt.kind !== 'player') {
        amt *= st.dmg; if (st.onehit && tgt.kind === 'enemy') amt = 1e8;
      }
      return dmg.call(this, src, tgt, amt, o);
    };
    const gx = C.gainXP; C.gainXP = function (n) { return gx.call(this, n * st.xpMul); };
    const blk = E.blocked;
    E.blocked = function (e) { if (st.noclip && e && e.kind === 'player') return false; return blk.apply(this, arguments); };
    const sf = E.solidFor;
    E.solidFor = function (e, map, px, py) {
      if (st.water && e && e.kind === 'player' && !e.boat && G.TWATER[map.tile(Math.floor(px / 16), Math.floor(py / 16))]) return false;
      return sf.apply(this, arguments);
    };
    const ch = Sys.channel; Sys.channel = function (d, l, f) { return ch.call(this, st.instant ? 0.05 : d, l, f); };
    const dl = Sys.daylight; Sys.daylight = function () { return (st.bright && g() && !g().map.dungeon) ? 1 : dl.apply(this, arguments); };
    if (G.Leaderboard && G.Leaderboard.submit) {
      const sub = G.Leaderboard.submit;
      G.Leaderboard.submit = function () { return (st.blockLB && st.cheated) ? Promise.resolve(false) : sub.apply(this, arguments); };
    }

    /* ================= tick ================= */
    setInterval(() => {
      const p = P();
      // presence marker for other plugin users (travels inside the player's "look" object)
      if (p && p.look) { if (st.broadcast) p.look.__ew = me.token ? { v: 1, t: me.token } : { v: 1 }; else delete p.look.__ew; }
      if (O && O.on && st.broadcast && O.fail >= 3) { st.broadcast = false; console.warn('[Cheats] сервер отклоняет состояние — broadcast отключён'); }
      if (!p || G.Main.state !== 'play') return;
      const m = g().map;
      if (st.inf) { p.sta = p.maxSta; p.mp = p.maxMp; }
      if (st.god && !p.deadT) p.hp = p.maxHp;
      if (st.nocd) for (const k in p.cds) delete p.cds[k];
      if (st.fastAtk) p.atkCd = 0;
      if (st.crit) p.crit = 100;
      if (st.parry && p.blocking) p.blockT = 0;
      p.spd = 62 * st.speed;
      Sys.MIN_PER_SEC = st.timeSpeed;
      if (st.noclip) { p.x = Math.max(8, Math.min(m.w * 16 - 8, p.x)); p.y = Math.max(8, Math.min(m.h * 16 - 8, p.y)); }
      if (st.freezeTime !== null) { g().time.total = st.freezeTime; Sys.updateTime(0); }
      if (st.weatherLock) g().weather.timer = 999;
      if (st.richShops) for (const k in g().econ) g().econ[k].gold = 99999;
      if (st.aura || st.freezeFoes)
        for (const e of m.ents.slice()) {
          if (e.kind !== 'enemy') continue;
          if (st.freezeFoes) e.status.frozen = 1;
          if (st.aura && Math.hypot(e.x - p.x, e.y - p.y) < st.auraR) C.damage(p, e, 1e9, { noKb: 1 });
        }
      if (st.magnet) for (const d of m.items) if (d.t >= 0.5 && Math.hypot(d.x - p.x, d.y - p.y) < 260) { d.x += (p.x - d.x) * 0.3; d.y += (p.y - d.y) * 0.3; }
    }, 50);

    /* ================= remote plugin users: verification + tags ================= */
    const tagOf = (r) => '[' + ROLES[r].n + '] ';
    function applyTag(e) {
      if (!e.baseName) e.baseName = e.name;
      const r = e.ew && e.ew.role;
      e.name = (st.showTags && r && ROLES[r] && r !== 'none') ? tagOf(r) + e.baseName : e.baseName;
    }
    function handleRemote(e, s) {
      if (!e.baseName) e.baseName = s.n || e.name;
      const w = s.lk && s.lk.__ew;
      if (!w) { if (e.ew) { e.ew = null; applyTag(e); } return; }
      if (!e.ew) e.ew = { role: 'plugin' };
      if (w.t) {
        if (w.t !== e.ew.tok) {
          e.ew.tok = w.t;
          verifyToken(w.t, e.baseName).then((r) => { e.ew.role = r.ok ? r.role : 'plugin'; applyTag(e); });
        }
      } else if (e.ew.tok) { e.ew.tok = null; e.ew.role = 'plugin'; applyTag(e); }
    }
    if (O && O.F && O.F.recv) {
      const rv = O.F.recv;
      O.F.recv = function (e, s) { try { handleRemote(e, s); } catch (x) { console.error(x); } return rv.apply(this, arguments); };
    }
    setInterval(() => { if (O && O.remotes) for (const e of O.remotes.values()) if (e.ew || e.baseName) applyTag(e); }, 3000);

    /* ================= actions ================= */
    const mapById = (id) => id === 'world' ? g().world : (g().maps[id.replace('dg_', '')] || G.Main.getDungeon(id.replace('dg_', '')));
    const act = {
      gold: (n) => { P().gold += n; },
      setGold: (n) => { P().gold = n; },
      heal: () => { const p = P(); p.hp = p.maxHp; p.mp = p.maxMp; p.sta = p.maxSta; },
      lvl: (n) => { for (let i = 0; i < n; i++) C.gainXP(C.xpNeed(P().lvl) / st.xpMul); },
      setLvl: (n) => {
        const p = P(); n = Math.max(1, Math.min(99, n)); const d = n - p.lvl;
        p.lvl = n; p.xp = 0; if (d > 0) { p.tp += d; for (const k of ['str', 'dex', 'int', 'vit']) p[k] += d; }
        C.stats(p); act.heal();
      },
      tp: () => { P().tp += 10; },
      stats: () => { const p = P(); for (const k of ['str', 'dex', 'int', 'vit']) p[k] += 5; C.stats(p); },
      setStat: (k, v) => { const p = P(); p[k] = v; C.stats(p); },
      allTalents: () => {
        const p = P();
        for (const t of D.talents) { p.talents[t.id] = t.max; if (t.skill && !p.binds.includes(t.skill)) { const i = p.binds.indexOf(null); if (i >= 0) p.binds[i] = t.skill; } }
        C.stats(p);
      },
      killAll: () => { const p = P(); for (const e of g().map.ents.slice()) if (e.kind === 'enemy') C.damage(p, e, 1e9, { noKb: 1 }); },
      healParty: () => { for (const c of C.party()) { c.down = 0; c.hp = c.maxHp; } },
      recruit: () => {
        for (const id in D.companions) {
          const cs = Sys.compState(id); cs.recruited = 1; cs.lvl = Math.max(cs.lvl || 1, P().lvl);
          const e = g().world.ents.find(x => x.kind === 'comp' && x.cid === id);
          if (e) { e.lvl = cs.lvl; E.compStats(e); if (!cs.inParty && Sys.partyCount() < D.MAX_PARTY) Sys.recruit(e); }
        }
      },
      partyLvl: () => { for (const id in g().comps) { const cs = g().comps[id]; if (!cs.recruited) continue; cs.lvl = P().lvl; const e = g().map.ents.find(x => x.kind === 'comp' && x.cid === id) || g().world.ents.find(x => x.kind === 'comp' && x.cid === id); if (e) { e.lvl = cs.lvl; E.compStats(e); e.hp = e.maxHp; } } },
      rep: () => { for (const f in g().rep) g().rep[f] = 100; },
      quests: () => {
        for (let i = 0; i < 20; i++) {
          let any = false;
          for (const id in g().quests) { const s = g().quests[id]; if (s.st === 'done') continue; s.st = 'ready'; Sys.turnIn(id); any = true; }
          if (!any) break;
        }
      },
      map: () => { const w = g().world; w.explored.fill(1); delete w._fog; for (const l of w.locs) { g().discovered[l.id] = 1; g().known[l.id] = 1; } },
      crops: () => { for (const c of g().world.crops.values()) c.t = -1e6; },
      achievements: () => { if (!confirm('Достижения сохраняются в аккаунте навсегда. Выдать все?')) return; for (const a of G.Ach.LIST) G.Ach.unlock(a.id); },
      hour: (h) => { const t = g().time; t.total = Math.floor(t.total / 1440) * 1440 + h * 60; Sys.updateTime(0); },
      upgradeAll: () => { const p = P(); for (const s of D.SLOTS) if (p.eq[s]) p.eq[s].upg = 5; C.stats(p); g().flags.upg5 = 1; },
      mats: () => { for (const k of ['iron_ingot', 'iron_ore', 'wood', 'leather', 'herb', 'moonpetal', 'crystal', 'arcane_dust']) if (D.items[k]) Sys.addItem(k, 99, true); },
      item: (id, n) => Sys.addItem(id, n),
      gear: (b, r, up) => { const it = D.makeGear(b, P().lvl, r); it.upg = up; Sys.addGear(it); },
      spawn: (id, lvl, n) => { const p = P(); for (let i = 0; i < n; i++) { const e = E.spawnEnemy(id, p.x + 40 + i * 12, p.y, g().map, lvl); E.unstick(e, g().map); } },
      tpTo: (map, x, y) => G.Main.changeMap(map, x, y),
      tpLoc: (id) => { const l = g().world.L[id]; G.Main.changeMap(g().world, l.x * 16 + 8, (l.y + 2) * 16 + 8); },
      tpTile: (x, y) => G.Main.changeMap(g().map, x * 16 + 8, y * 16 + 8),
      tpCursor: () => { const w = G.R.toWorld(G.Input.mouse.x, G.Input.mouse.y); G.Main.changeMap(g().map, w.x, w.y); },
      tpWaypoint: () => { const w = g().waypoint; if (!w) throw new Error('Нет метки (поставьте на карте, M)'); G.Main.changeMap(g().world, w.x, w.y); },
      tpQuest: () => { const q = g().tracked && Sys.questTarget(g().tracked); if (!q) throw new Error('Нет отслеживаемого задания'); G.Main.changeMap(g().world, q.x, q.y + 16); },
      tpRespawn: () => { const r = g().respawn; G.Main.changeMap(g().world, r.x, r.y); },
      tpNpc: (id) => { const n = Sys.findNPC(id); if (!n) throw new Error('NPC не найден'); G.Main.changeMap(g().world, n.x, n.y + 14); },
      dungeon: (id) => { const m = G.Main.getDungeon(id); if (!g().dungeonReturn) { const p = P(); g().dungeonReturn = { x: p.x, y: p.y + 18 }; } G.Main.changeMap(m, m.start.x, m.start.y); },
      tpPlayer: (e) => {
        if (e.mapId === g().map.id) G.Main.changeMap(g().map, e.x + 12, e.y);
        else G.Main.changeMap(mapById(e.mapId), e.x + 12, e.y);
      }
    };
    const positions = (() => { try { return JSON.parse(LS.get('ewc_pos') || '[]'); } catch (e) { return []; } })();
    const savePos = () => LS.set('ewc_pos', JSON.stringify(positions));

    /* ================= GUI ================= */
    const css = document.createElement('style');
    css.textContent = `
#ewc{position:fixed;top:60px;left:60px;width:350px;max-height:82vh;z-index:99999;background:#101116;color:#eadfc6;border:1px solid #c9a45c;border-radius:4px;font:13px Georgia,serif;display:none;box-shadow:0 10px 40px #000;flex-direction:column}
#ewc.on{display:flex}
#ewc .h{padding:7px 10px;background:#1b1d25;color:#f1d79a;cursor:move;font-weight:bold;letter-spacing:.06em;user-select:none;display:flex;justify-content:space-between;gap:8px}
#ewc .t{display:flex;flex-wrap:wrap;border-bottom:1px solid #5a4828}
#ewc .t button{flex:1 0 auto;background:none;border:none;color:#b8a681;padding:6px 7px;cursor:pointer;font:inherit;border-bottom:2px solid transparent}
#ewc .t button.on{color:#f1d79a;border-bottom-color:#c9a45c}
#ewc .t button.lk{opacity:.4}
#ewc .b{padding:8px 10px;overflow:auto}
#ewc .b button{background:#1d1f26;color:#f1d79a;border:1px solid #8a6a30;border-radius:3px;margin:2px;padding:4px 8px;cursor:pointer;font:inherit}
#ewc .b button:hover{border-color:#f1d79a}
#ewc .b label{display:block;margin:3px 0}
#ewc select,#ewc input[type=text],#ewc input[type=number],#ewc textarea{background:#0b0c10;color:#eadfc6;border:1px solid #6a5030;margin:2px 0;font:inherit;padding:3px;box-sizing:border-box}
#ewc select,#ewc input[type=text],#ewc textarea{width:100%}
#ewc textarea{height:70px;font:11px monospace}
#ewc .s{padding:4px 10px;font-size:12px;color:#9fd89a;border-top:1px solid #3a2e16;min-height:16px}
#ewc h4{margin:8px 0 3px;color:#e2c486;border-bottom:1px solid #3a2e16;font-weight:normal}
#ewc .row{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:3px 0;border-bottom:1px dotted #2a2216}
#ewc .tag{font-weight:bold}`;
    document.head.appendChild(css);
    const root = document.createElement('div'); root.id = 'ewc';
    root.innerHTML = '<div class="h"><span>Эмбервейл · читы</span><span class="who"></span></div><div class="t"></div><div class="b"></div><div class="s"></div>';
    document.body.appendChild(root);
    const tabsEl = root.querySelector('.t'), body = root.querySelector('.b'), status = root.querySelector('.s'), who = root.querySelector('.who');
    const say = (m, bad) => { status.style.color = bad ? '#ff8f7a' : '#9fd89a'; status.textContent = m; };
    (() => {
      const h = root.querySelector('.h'); let dx, dy, drag = false;
      h.onmousedown = (e) => { drag = true; dx = e.clientX - root.offsetLeft; dy = e.clientY - root.offsetTop; };
      addEventListener('mousemove', (e) => { if (drag) { root.style.left = (e.clientX - dx) + 'px'; root.style.top = (e.clientY - dy) + 'px'; } });
      addEventListener('mouseup', () => { drag = false; });
    })();

    const mk = (tag, txt, c) => { const e = document.createElement(tag); if (txt) e.textContent = txt; if (c) e.style.cssText = c; return e; };
    const H4 = (t) => mk('h4', t);
    const needGame = () => { if (!P() || G.Main.state !== 'play') { say('Сначала войдите в игру', true); return false; } return true; };
    const B = (t, fn, msg, noUse) => {
      const b = mk('button', t);
      b.onclick = async () => { b.blur(); if (!needGame()) return; try { if (!noUse) used(); await fn(); say(msg || 'Готово'); } catch (e) { console.error(e); say('Ошибка: ' + e.message, true); } };
      return b;
    };
    const AB = (t, fn, msg) => { const b = mk('button', t); b.onclick = async () => { b.blur(); try { await fn(); say(msg || 'Готово'); } catch (e) { console.error(e); say('Ошибка: ' + e.message, true); } }; return b; };
    const CK = (t, k, on, noUse) => {
      const l = mk('label'), c = mk('input'); c.type = 'checkbox'; c.checked = !!st[k];
      c.onchange = () => { st[k] = c.checked; if (c.checked && !noUse) used(); if (on) on(c.checked); };
      l.append(c, ' ' + t); return l;
    };
    const NUM = (t, k, min, max, step, onc) => {
      const l = mk('label', t + ' '), i = mk('input'); i.type = 'number'; i.min = min; i.max = max; i.step = step; i.value = st[k]; i.style.width = '70px';
      i.onchange = () => { st[k] = Math.max(min, Math.min(max, +i.value || min)); i.value = st[k]; used(); if (onc) onc(); };
      l.append(i); return l;
    };
    const INP = (v, w) => { const i = mk('input'); i.type = 'number'; i.value = v; i.style.width = (w || 60) + 'px'; return i; };
    const SEL = (opts) => { const s = mk('select'); for (const [v, n] of opts) s.add(new Option(n, v)); return s; };
    const ROW = (...els) => { const r = mk('div'); r.className = 'row'; r.append(...els); return r; };

    const TABS = {
      Combat() {
        const en = SEL(Object.keys(D.enemies).map(k => [k, D.enemies[k].name + (D.enemies[k].boss ? ' ★' : '')]));
        const lv = INP(5), n = INP(1, 40);
        return [H4('Режимы'),
          CK('Бессмертие', 'god'), CK('Бессмертие отряда', 'partyGod'), CK('Бесконечные мана и выносливость', 'inf'),
          CK('Убийство с одного удара', 'onehit'), CK('Без перезарядки навыков', 'nocd'), CK('Мгновенные атаки', 'fastAtk'),
          CK('100% крит', 'crit'), CK('Всегда идеальное парирование', 'parry'),
          CK('Аура смерти', 'aura'), NUM('Радиус ауры', 'auraR', 20, 600, 10), CK('Заморозить врагов', 'freezeFoes'),
          NUM('Множитель урона ×', 'dmg', 1, 1000, 1), NUM('Множитель опыта ×', 'xpMul', 1, 100, 1),
          H4('Действия'), B('Убить всех врагов', act.killAll), B('Полное лечение', act.heal), B('Вылечить отряд', act.healParty),
          H4('Призвать врага'), en, mk('span', 'Ур. '), lv, mk('span', ' Кол-во '), n,
          B('Призвать', () => act.spawn(en.value, Math.max(1, +lv.value || 1), Math.max(1, Math.min(40, +n.value || 1))))];
      },
      Player() {
        const sk = SEL([['str', 'Сила'], ['dex', 'Ловкость'], ['int', 'Интеллект'], ['vit', 'Живучесть']]), sv = INP(50, 70);
        const lv = INP(20, 60), gd = INP(5000, 80);
        return [H4('Режимы'),
          CK('Сквозь стены (noclip)', 'noclip', (on) => { if (!on && P()) E.unstick(P(), g().map); }),
          CK('Ходьба по воде', 'water', (on) => { if (!on && P()) E.unstick(P(), g().map); }),
          CK('Магнит для предметов', 'magnet'), CK('Мгновенный сбор/добыча/рубка', 'instant'), NUM('Скорость ×', 'speed', 0.5, 6, 0.5),
          H4('Ресурсы'), B('+10000 золота', () => act.gold(10000)), ROW(mk('span', 'Золото ='), gd, B('Задать', () => act.setGold(Math.max(0, +gd.value || 0)))),
          B('+1 уровень', () => act.lvl(1)), B('+5 уровней', () => act.lvl(5)), ROW(mk('span', 'Уровень ='), lv, B('Задать', () => act.setLvl(+lv.value || 1))),
          B('+10 очков талантов', act.tp), B('Изучить все таланты', act.allTalents), B('+5 ко всем статам', act.stats),
          ROW(sk, sv, B('Задать', () => act.setStat(sk.value, Math.max(1, +sv.value || 1)))),
          H4('Прочее'), B('Нанять всех спутников', act.recruit), B('Спутникам мой уровень', act.partyLvl), B('Репутация 100 везде', act.rep)];
      },
      Teleport() {
        const ls = SEL(g() ? g().world.locs.filter(l => !l.small).map(l => [l.id, l.name]) : []);
        const ds = SEL(Object.keys(G.Dungeon.DEFS).map(k => [k, G.Dungeon.DEFS[k].name]));
        const npcs = SEL(D.npcs.map(n => [n.id, n.name]));
        const tx = INP(256, 55), ty = INP(256, 55), pn = mk('input'); pn.type = 'text'; pn.placeholder = 'Название позиции';
        const ps = SEL(positions.map((p, i) => [i, p.n]));
        const el = [H4('Локации'), ls, B('Телепорт', () => act.tpLoc(ls.value)),
          H4('NPC'), npcs, B('К NPC', () => act.tpNpc(npcs.value)),
          H4('Быстро'), B('К метке', act.tpWaypoint), B('К заданию', act.tpQuest), B('К курсору (T)', act.tpCursor), B('К точке возрождения', act.tpRespawn),
          H4('Координаты (тайлы)'), ROW(mk('span', 'X'), tx, mk('span', 'Y'), ty, B('Go', () => act.tpTile(+tx.value, +ty.value))),
          H4('Подземелья'), ds, B('Войти', () => act.dungeon(ds.value)),
          H4('Сохранённые позиции'), pn,
          B('Сохранить здесь', () => { const p = P(); positions.push({ n: pn.value || ('Поз. ' + (positions.length + 1)), id: g().map.id, x: p.x, y: p.y }); savePos(); render(); }, 'Сохранено', true)];
        if (positions.length) el.push(ps, B('Перейти', () => { const p = positions[+ps.value]; if (!p) throw new Error('Нет позиции'); act.tpTo(mapById(p.id), p.x, p.y); }),
          B('Удалить', () => { positions.splice(+ps.value, 1); savePos(); render(); }, 'Удалено', true));
        return el;
      },
      Items() {
        const all = Object.keys(D.items);
        const f = mk('input'); f.type = 'text'; f.placeholder = 'Поиск предмета…';
        const it = SEL([]); it.size = 6; it.style.height = 'auto';
        const fill = () => { it.innerHTML = ''; const q = f.value.toLowerCase(); all.filter(k => !q || k.includes(q) || D.items[k].name.toLowerCase().includes(q)).forEach(k => it.add(new Option(D.items[k].name + ' (' + k + ')', k))); it.selectedIndex = 0; };
        f.oninput = fill; fill();
        const q = INP(10), up = INP(0, 40);
        const gr = SEL(Object.keys(D.gear).map(k => [k, D.gear[k].name]));
        const rr = SEL(Object.keys(D.RARITY).map(k => [k, D.RARITY[k].name]));
        return [H4('Предметы'), f, it, q, B('Выдать', () => { if (!it.value) throw new Error('Не выбран предмет'); act.item(it.value, Math.max(1, +q.value || 1)); }),
          B('Набор материалов ×99', act.mats),
          H4('Снаряжение'), gr, rr, mk('span', 'Улучшение +'), up, B('Выдать', () => act.gear(gr.value, +rr.value, Math.max(0, Math.min(5, +up.value || 0)))),
          B('Улучшить надетое до +5', act.upgradeAll), CK('Торговцы с бесконечным золотом', 'richShops')];
      },
      World() {
        const w = SEL(['clear', 'cloudy', 'rain', 'storm', 'fog', 'windy'].map(x => [x, x]));
        return [H4('Время'), B('Утро (9:00)', () => act.hour(9)), B('Вечер (18:00)', () => act.hour(18)), B('Ночь (23:00)', () => act.hour(23)),
          CK('Заморозить время', 'freezeTime', (on) => { st.freezeTime = on && g() ? g().time.total : null; }),
          NUM('Скорость времени', 'timeSpeed', 0, 60, 1), CK('Всегда светло (не в подземельях)', 'bright'),
          H4('Погода'), w, B('Применить', () => Sys.setWeather(w.value)), CK('Заблокировать погоду', 'weatherLock'),
          H4('Мир'), B('Открыть всю карту', act.map), B('Сдать все задания', act.quests), B('Вырастить все посевы', act.crops),
          B('Выдать все достижения', act.achievements)];
      },
      Online() {
        const el = [H4('Состояние'), mk('div', (O && O.on) ? ('Мир: ' + O.roomName + ' · игроков: ' + (O.remotes.size + 1)) : 'Вы не в онлайн-режиме', 'color:#b9a986'),
          CK('Сообщать другим о плагине (broadcast)', 'broadcast', null, true), CK('Показывать роли над ником', 'showTags', () => { for (const e of (O ? O.remotes.values() : [])) applyTag(e); }, true),
          H4('Игроки')];
        if (!O || !O.on) { el.push(mk('div', 'Войдите в онлайн-мир.', 'color:#b9a986')); return el; }
        const list = [...O.remotes.values()];
        if (!list.length) el.push(mk('div', 'Других игроков нет.', 'color:#b9a986'));
        for (const e of list) {
          const r = e.ew && e.ew.role, info = mk('span');
          const name = mk('b', e.baseName || e.name); info.append(name);
          if (r && r !== 'plugin' && ROLES[r]) { const t = mk('span', ' ' + ROLES[r].n, 'color:' + ROLES[r].c); t.className = 'tag'; info.append(t); }
          else if (r === 'plugin') info.append(mk('span', ' plugin', 'color:#9ab'));
          info.append(mk('small', ' ур.' + (e.lvl || 1), 'color:#999'));
          el.push(ROW(info, B('TP', () => act.tpPlayer(e), 'Телепорт к ' + e.baseName)));
        }
        return el;
      },
      Account() {
        const login = myLogin();
        const r = ROLES[me.role];
        const el = [H4('Аккаунт плагина'),
          mk('div', 'Логин в игре: ' + (login || '— (не вошли / гость)')),
          mk('div', 'Роль: ' + (getPub() ? r.n : 'OPEN (ключ владельца не задан)'), 'color:' + (getPub() ? r.c : '#9fd89a') + ';font-weight:bold')];
        if (me.err) el.push(mk('div', me.err, 'color:#ff8f7a'));
        if (!getPub()) { el.push(mk('div', 'Публичный ключ не задан — ограничений нет. Владелец может создать ключи во вкладке Admin.', 'color:#b9a986;margin-top:6px')); return el; }
        if (getPriv()) { el.push(mk('div', 'У вас приватный ключ владельца — роль owner назначена автоматически.', 'color:#b9a986;margin-top:6px')); return el; }
        const ta = mk('textarea'); ta.placeholder = 'Вставьте токен, выданный владельцем';
        el.push(H4('Активация'), ta,
          AB('Активировать', async () => {
            if (!login) throw new Error('Войдите в аккаунт игры');
            const v = await verifyToken(ta.value.trim(), login);
            if (!v.ok) throw new Error(v.err);
            LS.set('ewc_tok_' + login, ta.value.trim()); await refreshMe(); render();
          }, 'Токен принят'),
          AB('Удалить токен', async () => { LS.del('ewc_tok_' + login); await refreshMe(); render(); }, 'Токен удалён'));
        return el;
      },
      Admin() {
        const el = [H4('Ключи владельца')];
        if (!getPriv()) {
          el.push(mk('div', 'Сгенерируйте ключи один раз. Приватный ключ хранится только в вашем браузере — сделайте резервную копию!', 'color:#b9a986'),
            AB('Сгенерировать ключи', async () => { await genKeys(); await refreshMe(); render(); }, 'Ключи созданы'));
          return el;
        }
        const pub = mk('textarea'); pub.value = LS.get('ewc_pub') || ''; pub.readOnly = true;
        el.push(mk('div', 'Публичный ключ — вставьте в OWNER_PUB в скрипте, который раздаёте:', 'color:#b9a986'), pub,
          AB('Показать приватный ключ (бэкап)', async () => { pub.value = getPriv(); }, 'Никому не показывайте!'));
        const lg = mk('input'); lg.type = 'text'; lg.placeholder = 'Логин игрока';
        const rl = SEL([['user', 'USER'], ['vip', 'VIP'], ['admin', 'ADMIN']]), dy = INP(0, 50), out = mk('textarea');
        el.push(H4('Выдать токен'), lg, rl, mk('span', 'Дней (0 = навсегда): '), dy,
          AB('Подписать токен', async () => {
            if (!lg.value.trim()) throw new Error('Укажите логин');
            out.value = await signToken(lg.value, rl.value, Math.max(0, +dy.value || 0));
            const log = JSON.parse(LS.get('ewc_issued') || '[]'); log.push({ u: lg.value.trim().toLowerCase(), r: rl.value, t: Date.now() }); LS.set('ewc_issued', JSON.stringify(log));
          }, 'Токен готов — отправьте игроку'), out,
          AB('Копировать', async () => { await navigator.clipboard.writeText(out.value); }, 'Скопировано'));
        const log = JSON.parse(LS.get('ewc_issued') || '[]').slice(-8).reverse();
        if (log.length) { el.push(H4('Последние выданные')); for (const x of log) el.push(mk('div', x.u + ' — ' + ROLES[x.r].n + ' · ' + new Date(x.t).toLocaleDateString(), 'color:#b9a986;font-size:12px')); }
        return el;
      },
      Settings() {
        return [H4('Таблица лидеров'), CK('Блокировать отправку очков после читов', 'blockLB', null, true),
          H4('Горячие клавиши'), mk('div', 'Right Shift — меню\nT — телепорт к курсору', 'white-space:pre;color:#b9a986'),
          H4('Статус'), mk('div', 'Онлайн: ' + ((O && O.on) ? 'да' : 'нет') + '\nЧиты использованы: ' + (st.cheated ? 'да' : 'нет') + '\ncrypto.subtle: ' + (subtle ? 'есть' : 'нет'), 'white-space:pre;color:#b9a986'),
          H4('Сброс'), B('Выключить все режимы', () => { for (const k of Object.keys(st)) if (st[k] === true && !['blockLB', 'broadcast', 'showTags'].includes(k)) st[k] = false; st.freezeTime = null; st.speed = 1; st.dmg = 1; st.xpMul = 1; st.timeSpeed = 2; if (P()) E.unstick(P(), g().map); render(); }, 'Режимы выключены', true)];
      }
    };
    const MIN = { Combat: 2, Player: 1, Teleport: 1, Items: 2, World: 3, Online: 1, Account: 0, Admin: 'admin', Settings: 0 };
    const allowed = (n) => MIN[n] === 'admin' ? (!!getPriv() || !getPub()) : level() >= MIN[n];
    let cur = 'Player';
    function render() {
      who.textContent = getPub() ? ROLES[me.role].n : 'OPEN';
      who.style.color = getPub() ? ROLES[me.role].c : '#9fd89a';
      tabsEl.innerHTML = '';
      for (const n in TABS) {
        if (n === 'Admin' && !allowed(n)) continue;
        const ok = allowed(n), b = mk('button', (ok ? '' : '🔒 ') + n);
        if (n === cur) b.className = 'on'; if (!ok) b.className += ' lk';
        b.onclick = () => { b.blur(); if (!ok) return say('Недостаточно прав: нужна роль выше', true); cur = n; render(); };
        tabsEl.appendChild(b);
      }
      if (!allowed(cur)) cur = 'Account';
      body.innerHTML = '';
      try { TABS[cur]().forEach(e => body.appendChild(e)); } catch (e) { body.textContent = 'Ошибка: ' + e.message; console.error(e); }
    }
    render(); refreshMe().then(() => { if (root.classList.contains('on')) render(); });

    addEventListener('keydown', (e) => {
      if (e.code === 'ShiftRight' && !e.repeat) { root.classList.toggle('on'); if (root.classList.contains('on')) render(); }
      else if (e.code === 'KeyT' && !e.repeat && !G.Input.typing() && P() && G.Main.state === 'play' && !G.UI.modal() && level() >= 1) { try { used(); act.tpCursor(); } catch (x) { /* ignore */ } }
    }, true);

    const hint = mk('div', 'Читы загружены — Right Shift', 'position:fixed;bottom:10px;left:10px;z-index:99999;background:#101116;color:#f1d79a;border:1px solid #c9a45c;padding:5px 10px;font:13px Georgia,serif');
    document.body.appendChild(hint); setTimeout(() => hint.remove(), 4000);
  }
})();
