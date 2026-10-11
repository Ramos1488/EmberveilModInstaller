// ==UserScript==
// @name         Emberveil Mod Loader
// @version      1.1
// @match       https://emberveil.vercel.app/
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Ramos1488/EmberveilModInstaller/main/installer/mod-installer.user.js
// @downloadURL  https://raw.githubusercontent.com/Ramos1488/EmberveilModInstaller/main/installer/mod-installer.user.js
// ==/UserScript==
(function () {
  'use strict';
  if (window.__ewMods) return;
  const CATALOG_URL = 'https://raw.githubusercontent.com/Ramos1488/EmberveilModInstaller/main/catalog.json';
  const WEBHOOK = 'https://discord.com/api/webhooks/1558885894717571226/ITSkZX4ME9lQgyx9T7K3CWVtp4F1vIgz0vUaTuL8ndB_5LQ4VyaOhZ1zCVoWBvmYYEnR';
  const RISKY = [
    [/localStorage|sessionStorage|document\.cookie/, 'доступ к хранилищу'],
    [/fetch\(|XMLHttpRequest|WebSocket|sendBeacon/, 'сеть'],
    [/eval\(|new Function/, 'eval'],
    [/createElement\(['"]script/, 'внешний скрипт'],
    [/atob\(|fromCharCode/, 'возможная обфускация']
  ];
  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  let tries = 0;
  const iv = setInterval(() => {
    if (window.G && G.Main && G.UI && G.Data) { clearInterval(iv); init(); }
    else if (++tries > 100) clearInterval(iv);
  }, 300);

  function init() {
    window.__ewMods = 1;
    const safe = location.hash.includes('nomods');
    const inst = LS.get('ewm_inst', {});
    const errors = {}, loaded = {};
    const save = () => LS.set('ewm_inst', inst);
    const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
    const b64e = (s) => btoa(unescape(encodeURIComponent(s)));
    const b64d = (s) => decodeURIComponent(escape(atob(s)));
    const fetchText = async (url) => {
      if (!/^https:\/\//i.test(url)) throw new Error('Нужна ссылка https://');
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    };

    window.EWMod = {
      log: (...a) => console.log('[Mod]', ...a),
      toast: (t) => G.UI.toast && G.UI.toast(t, 'item'),
      online: () => !!(G.Online && G.Online.on)
    };
    function run(id) {
      const m = inst[id]; if (!m || !m.on || loaded[id]) return;
      const store = { get: (k, d) => LS.get('ewm_s_' + id + '_' + k, d), set: (k, v) => LS.set('ewm_s_' + id + '_' + k, v) };
      try { new Function('EWMod', 'G', m.code)(Object.assign({}, window.EWMod, { id, store }), window.G); loaded[id] = 1; delete errors[id]; }
      catch (e) { errors[id] = e.message; console.error('[Mod ' + m.meta.name + ']', e); }
    }
    if (!safe) Object.keys(inst).forEach(run);

    /* ---------- UI ---------- */
    const css = document.createElement('style');
    css.textContent = `#ewm{position:fixed;top:50px;left:50%;transform:translateX(-50%);width:560px;max-width:96vw;max-height:84vh;z-index:99998;background:#101116;color:#eadfc6;border:1px solid #c9a45c;border-radius:4px;font:13px Georgia,serif;display:none;flex-direction:column;box-shadow:0 10px 40px #000}
#ewm.on{display:flex}#ewm .h{padding:8px 12px;background:#1b1d25;color:#f1d79a;font-weight:bold;display:flex;justify-content:space-between}
#ewm .t{display:flex;border-bottom:1px solid #5a4828}#ewm .t button{flex:1;background:none;border:none;color:#b8a681;padding:7px;cursor:pointer;font:inherit;border-bottom:2px solid transparent}
#ewm .t button.on{color:#f1d79a;border-bottom-color:#c9a45c}#ewm .b{padding:10px;overflow:auto}
#ewm button.a{background:#1d1f26;color:#f1d79a;border:1px solid #8a6a30;border-radius:3px;margin:2px;padding:4px 9px;cursor:pointer;font:inherit}
#ewm button.a:hover{border-color:#f1d79a}#ewm input,#ewm textarea{background:#0b0c10;color:#eadfc6;border:1px solid #6a5030;padding:4px;font:inherit;box-sizing:border-box;width:100%;margin:2px 0}
#ewm textarea{font:11px monospace;height:130px}#ewm .m{border:1px solid #3a2e16;border-radius:3px;padding:8px;margin:6px 0;background:#15171d}
#ewm .m b{color:#f1d79a}#ewm small{color:#9a8c6a}#ewm .s{padding:5px 12px;border-top:1px solid #3a2e16;min-height:18px;font-size:12px}
#ewm .w{background:#2a1510;border:1px solid #9a4a36;padding:6px;margin-bottom:8px;color:#ffb8a6;font-size:12px}`;
    document.head.appendChild(css);
    const root = document.createElement('div'); root.id = 'ewm';
    root.innerHTML = '<div class="h"><span>🧩 Emberveil Mod Loader</span><span style="cursor:pointer" class="x">✕</span></div><div class="t"></div><div class="b"></div><div class="s"></div>';
    document.body.appendChild(root);
    const btn = document.createElement('button'); btn.textContent = '🧩 Моды';
    btn.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:99997;opacity:.55;cursor:pointer;background:#101116;color:#f1d79a;border:1px solid #c9a45c;border-radius:4px;padding:4px 8px';
    document.body.appendChild(btn);
    const tabsEl = root.querySelector('.t'), body = root.querySelector('.b'), status = root.querySelector('.s');
    const say = (m, bad) => { status.style.color = bad ? '#ff8f7a' : '#9fd89a'; status.textContent = m; };
    const mk = (tag, txt, c) => { const e = document.createElement(tag); if (txt) e.textContent = txt; if (c) e.style.cssText = c; return e; };
    const A = (t, fn) => { const b = mk('button', t); b.className = 'a'; b.onclick = async () => { b.blur(); try { await fn(); } catch (e) { say(e.message, true); } }; return b; };
    const warn = (t) => { const w = mk('div', t); w.className = 'w'; return w; };
    const toggle = () => { root.classList.toggle('on'); if (root.classList.contains('on')) render(); };
    btn.onclick = toggle; root.querySelector('.x').onclick = toggle;
    addEventListener('keydown', (e) => { if (e.code === 'F8' && !e.repeat) { e.preventDefault(); toggle(); } }, true);

    const viewCode = (code) => { const w = window.open('', '_blank'); if (w) { const pre = w.document.createElement('pre'); pre.textContent = code; w.document.body.appendChild(pre); } };
    const card = (m, extra) => {
      const d = mk('div'); d.className = 'm';
      const t = mk('div'); t.append(mk('b', m.name), mk('small', ' v' + (m.version || '1.0') + ' · ' + (m.author || 'аноним')));
      d.append(t, mk('div', m.desc || 'Без описания', 'margin:4px 0;color:#c9bb98'), ...extra); return d;
    };
    async function install(meta, code, expectHash) {
      const h = await sha(code);
      if (expectHash && h !== expectHash) throw new Error('Хеш не совпал — файл изменён или повреждён');
      if (!confirm('Установить «' + meta.name + '» (' + (meta.author || 'аноним') + ')?\n\nМод получает ПОЛНЫЙ доступ к игре и localStorage страницы (сохранения, ключи). Ставьте только то, чему доверяете, и сначала прочитайте код.')) return;
      const id = meta.id || h.slice(0, 10);
      inst[id] = { meta: Object.assign({}, meta, { id, hash: h }), code, on: true }; save(); run(id);
      say('Установлено: ' + meta.name); render();
    }
    const nameFrom = (code, fb) => { const m = code.match(/@name\s+(.+)/); return m ? m[1].trim() : fb; };

    const TABS = {
      async Каталог() {
        const f = mk('input'); f.placeholder = 'Поиск…'; const list = mk('div', 'Загрузка…', 'color:#b9a986');
        let mods = [];
        const draw = () => {
          list.innerHTML = ''; const q = f.value.toLowerCase();
          const r = mods.filter(m => !q || ((m.name || '') + (m.author || '') + (m.desc || '')).toLowerCase().includes(q));
          if (!r.length) list.textContent = 'Ничего не найдено.';
          for (const m of r) {
            const have = inst[m.id], upd = have && have.meta.hash !== m.hash;
            list.appendChild(card(m, [
              A(have ? (upd ? 'Обновить' : 'Установлен') : 'Установить', async () => { if (have && !upd) return; await install(m, await fetchText(m.url), m.hash); }),
              A('Код', async () => viewCode(await fetchText(m.url)))]));
          }
        };
        f.oninput = draw;
        fetchText(CATALOG_URL).then(t => { mods = JSON.parse(t).mods || []; draw(); }).catch(e => { list.textContent = 'Каталог недоступен: ' + e.message; });
        return [warn('⚠ Моды — чужой код, выполняемый в вашей игре. Читайте код перед установкой.'), f, list];
      },
      async Установка() {
        const url = mk('input'), code = mk('textarea'), file = mk('input'), nm = mk('input');
        url.placeholder = 'https://raw.githubusercontent.com/... или Gist raw'; code.placeholder = 'Вставьте код мода или строку EWM1:...'; nm.placeholder = 'Название (если не определится)';
        file.type = 'file'; file.accept = '.js,.txt'; file.onchange = async () => { if (file.files[0]) { code.value = await file.files[0].text(); nm.value = nm.value || file.files[0].name.replace(/\.\w+$/, ''); } };
        return [warn('⚠ Ставьте только проверенный код.'), mk('b', 'По ссылке'), url,
          A('Скачать и установить', async () => { const c = await fetchText(url.value.trim()); await install({ name: nameFrom(c, url.value.split('/').pop() || 'Мод'), author: 'по ссылке', url: url.value.trim() }, c); }),
          mk('div', '', 'height:8px'), mk('b', 'Из файла / вставкой / кода EWM1'), file, nm, code,
          A('Установить', async () => {
            const t = code.value.trim(); if (!t) throw new Error('Пусто');
            if (t.startsWith('EWM1:')) { const o = JSON.parse(b64d(t.slice(5))); await install({ name: o.n, version: o.v, author: o.a, desc: o.d }, o.c); return; }
            await install({ name: nm.value.trim() || nameFrom(t, 'Мод'), author: 'локальный' }, t);
          })];
      },
      async Установлено() {
        const out = [];
        if (safe) out.push(warn('Безопасный режим (#nomods): моды не запускаются.'));
        const ids = Object.keys(inst);
        if (!ids.length) out.push(mk('div', 'Модов нет.', 'color:#b9a986'));
        for (const id of ids) {
          const m = inst[id];
          const ex = [A(m.on ? 'Выключить' : 'Включить', () => { m.on = !m.on; save(); if (m.on) run(id); else say('Выключено — полностью после перезагрузки'); render(); }),
            A('Код', () => viewCode(m.code)),
            A('Удалить', () => { if (!confirm('Удалить мод?')) return; delete inst[id]; save(); say('Удалено — перезагрузите страницу'); render(); })];
          if (errors[id]) ex.push(mk('div', 'Ошибка: ' + errors[id], 'color:#ff8f7a')); else if (loaded[id]) ex.push(mk('small', ' ● запущен'));
          out.push(card(m.meta, ex));
        }
        return out;
      },
      async Отправить() {
        const nm = mk('input'), vs = mk('input'), au = mk('input'), ds = mk('input'), code = mk('textarea'), file = mk('input');
        nm.placeholder = 'Название'; vs.placeholder = 'Версия'; vs.value = '1.0'; au.placeholder = 'Автор'; ds.placeholder = 'Описание (до 300 символов)';
        code.placeholder = 'Код мода'; file.type = 'file'; file.accept = '.js,.txt';
        file.onchange = async () => { if (file.files[0]) code.value = await file.files[0].text(); };
        return [warn('Мод попадёт в каталог только после проверки админами в Discord.'), nm, vs, au, ds, file, code,
          A('Отправить на проверку', async () => {
            if (Date.now() - LS.get('ewm_lastsub', 0) < 300000) throw new Error('Не чаще раза в 5 минут');
            const src = code.value.replace(/^\uFEFF/, '');
            if (!nm.value.trim() || !src.trim()) throw new Error('Нужны название и код');
            if (src.length > 200 * 1024) throw new Error('Больше 200 КБ');
            const hash = await sha(src);
            const flags = RISKY.filter(([re]) => re.test(src)).map(([, t]) => t);
            const slug = nm.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mod';
            const fd = new FormData();
            fd.append('payload_json', JSON.stringify({
              allowed_mentions: { parse: [] },
              embeds: [{
                title: ('Новый мод: ' + nm.value).slice(0, 250), description: ds.value.slice(0, 300), color: flags.length ? 0xe0803a : 0x5ad85a,
                fields: [
                  { name: 'Автор', value: (au.value || 'аноним').slice(0, 100), inline: true },
                  { name: 'Версия', value: (vs.value || '1.0').slice(0, 20), inline: true },
                  { name: 'Размер', value: Math.round(src.length / 102.4) / 10 + ' КБ', inline: true },
                  { name: 'SHA-256', value: '`' + hash + '`' },
                  { name: 'Авто-флаги (не заменяют чтение кода)', value: flags.length ? flags.join(', ') : 'не найдено' }
                ]
              }],
              attachments: [{ id: 0, filename: slug + '.js' }]
            }));
            fd.append('files[0]', new Blob([src], { type: 'text/javascript' }), slug + '.js');
            const r = await fetch(WEBHOOK, { method: 'POST', body: fd });
            if (!r.ok) throw new Error('Discord: HTTP ' + r.status);
            LS.set('ewm_lastsub', Date.now()); say('Отправлено на проверку');
          })];
      }
    };
    let cur = 'Каталог';
    async function render() {
      tabsEl.innerHTML = '';
      for (const n in TABS) { const b = mk('button', n); if (n === cur) b.className = 'on'; b.onclick = () => { cur = n; render(); }; tabsEl.appendChild(b); }
      body.innerHTML = '';
      try { (await TABS[cur]()).forEach(e => body.appendChild(e)); } catch (e) { body.textContent = 'Ошибка: ' + e.message; }
    }
    console.log('[ModLoader] loaded — F8');
  }
})();
