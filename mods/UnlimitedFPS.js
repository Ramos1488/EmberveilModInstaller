// @name UnlimitedFPS
// @author Foxi005305
// @version 1.0
// @description Снимает ограничение FPS (убирает vsync/кап, ставит высокий лимит)
if (window.__ewFPS) return;
window.__ewFPS = 1;

const S = EWMod?.store;
const DEF = { enabled: true, target: 0 }; // 0 = без лимита
const cfg = Object.assign({}, DEF, S?.get?.('fpsCfg', {}) || {});
const save = () => S?.set?.('fpsCfg', cfg);

function unlock() {
  if (!cfg.enabled) return;


  if (G?.settings) {
    if ('fps' in G.settings) G.settings.fps = cfg.target || 9999;
    if ('maxFps' in G.settings) G.settings.maxFps = cfg.target || 9999;
    if ('vsync' in G.settings) G.settings.vsync = false;
    if ('limitFps' in G.settings) G.settings.limitFps = false;
  }
  
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

  if (R?.draw && !R.__fpsPatched) {
    R.__fpsPatched = true;
    const origDraw = R.draw;
    R.draw = function () {
      const r = origDraw.apply(this, arguments);
     
      if (cfg.enabled && cfg.target === 0) {
    
      }
      return r;
    };
  }

  EWMod?.log?.('UnlimitedFPS: разблокировано' + (cfg.target ? ` (лимит ${cfg.target})` : ' (без лимита)'));
}

unlock();
setInterval(unlock, 2000);

addEventListener('keydown', (e) => {
  if (e.code === 'F8' && !e.repeat && !G?.Input?.typing?.()) {
    cfg.enabled = !cfg.enabled;
    save();
    unlock();
    EWMod?.log?.('UnlimitedFPS: ' + (cfg.enabled ? 'ВКЛ' : 'ВЫКЛ'));
  }
}, true);

EWMod?.log?.('UnlimitedFPS 1.0 загружен — F8 вкл/выкл');
