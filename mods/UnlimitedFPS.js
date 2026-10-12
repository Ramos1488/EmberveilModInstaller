// @name         Unlimited FPS
// @author       Foxi005305
// @version      1.2
// @description  Снимает ограничение FPS (отключает vsync и кап)

(function (EWMod, G) {
  'use strict';
  if (window.__ewFPS) return;
  window.__ewFPS = 1;

  const store = EWMod.store;
  const DEF = { enabled: true, target: 0 }; // 0 = без лимита
  const cfg = Object.assign({}, DEF, store.get('cfg', {}));
  const save = () => store.set('cfg', cfg);

  function unlock() {
    if (!cfg.enabled) return;

    // 1. Настройки игры
    if (G?.settings) {
      if ('fps' in G.settings) G.settings.fps = cfg.target || 9999;
      if ('maxFps' in G.settings) G.settings.maxFps = cfg.target || 9999;
      if ('vsync' in G.settings) G.settings.vsync = false;
      if ('limitFps' in G.settings) G.settings.limitFps = false;
    }

    // 2. Патч requestAnimationFrame (снимаем привязку к vsync)
    if (!window.__origRAF) {
      window.__origRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = function (cb) {
        if (cfg.target > 0) {
          const now = performance.now();
          const minInterval = 1000 / cfg.target;
          if (window.__lastFrame && now - window.__lastFrame < minInterval) {
            return setTimeout(() => window.__origRAF(cb), minInterval - (now - window.__lastFrame));
          }
          window.__lastFrame = now;
        }
        return window.__origRAF(cb);
      };
    }

    EWMod.log('UnlimitedFPS: ' + (cfg.target ? `лимит ${cfg.target}` : 'без лимита'));
  }

  // Применяем сразу и периодически
  unlock();
  setInterval(unlock, 2500);

  // Бинд F9 — вкл/выкл
  addEventListener('keydown', (e) => {
    if (e.code === 'F9' && !e.repeat && !(G.Input && G.Input.typing && G.Input.typing())) {
      e.preventDefault();
      cfg.enabled = !cfg.enabled;
      save();
      unlock();
      EWMod.log('UnlimitedFPS: ' + (cfg.enabled ? 'ВКЛ' : 'ВЫКЛ'));
      EWMod.toast && EWMod.toast(cfg.enabled ? 'FPS разблокирован' : 'FPS ограничен');
    }
  }, true);

  EWMod.log('Unlimited FPS 1.2 загружен — F9 вкл/выкл');
})(EWMod, G);
