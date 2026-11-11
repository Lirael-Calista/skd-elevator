/* ============================================================
   首屏背景图入场动画
   ------------------------------------------------------------
   设计思路：一次「轻微推近 + 由暗转亮」的单一运动，不做模糊、不做光线扫过。
     1) 起幅：第一帧就是这张夜景，只是略微后拉（scale 1.16）并盖一层压暗。
        画面本身清清楚楚，不会出现一块深蓝/灰色的空底板。
     2) 推近：power2.out，1.0s 走完（移动 0.85s）
     3) 提亮：压暗层的透明度同步淡出，与推近几乎同时收尾
     4) 落幅：停住，不再有任何常驻运动
   为什么不用模糊 / 不逐帧改颜色：
     全屏高斯模糊和逐帧颜色矩阵都要在每一帧重新算一遍整块图层（集显尤其吃不住），
     实测这是掉帧与白卡闪烁的来源。现在全程只动 transform 与 opacity，
     浏览器只做合成，没有重绘，60fps 很轻松。
   起播时机：等首帧真正绘制、且帧间隔恢复正常后才建时间线，
     避免浏览器光栅化期间动画时钟空跑。
   起幅数值只在 CSS 里维护一份：脚本读取当时的实际 transform 再固化，
   因此桌面端与移动端各自的起幅差异不需要在 JS 里重复写一遍。
   ============================================================ */
(function () {
  var root = document.documentElement;
  var bg = document.querySelector('.hero-bg');
  var scrim = document.querySelector('.hero-scrim');

  if (!bg) { root.classList.remove('js-anim'); return; }

  var gsap = window.gsap;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 安全兜底：任何一步出问题都回到“静态清晰可见”，绝不让首屏背景消失 */
  function fallback() {
    root.classList.remove('js-anim');
    bg.style.opacity = '';
    bg.style.transform = '';
    bg.style.willChange = '';
    if (scrim) { scrim.style.opacity = ''; scrim.style.willChange = ''; }
  }

  if (reduce || !gsap) { fallback(); return; }

  /* 只有很长的卡顿（>250ms）才按 33ms 计，避免时钟暴走把动画一次性快进；
     一般的掉帧照实推进，动画节奏不会被人为拉慢 */
  if (gsap.ticker && gsap.ticker.lagSmoothing) gsap.ticker.lagSmoothing(250, 33);

  var isMobile = window.matchMedia('(max-width: 1080px)').matches;
  var dur = isMobile ? 0.85 : 1.0;

  var started = false;

  /* 真正建时间线：只在首帧画完之后调用（见 play 里的说明） */
  function buildTimeline() {
    if (started) return;
    started = true;
    try {
      var tl = gsap.timeline({
        onComplete: function () {
          /* 交还给 CSS：清掉内联的临时值，并回收 will-change，落幅后完全静止 */
          gsap.set(bg, { clearProps: 'x,y', willChange: 'auto' });
          if (scrim) gsap.set(scrim, { clearProps: 'opacity', willChange: 'auto' });
        }
      });

      /* 推近：距离不大，用 power2.out 让起步柔和、收尾干净，不会一顿就停 */
      tl.to(bg, { scale: 1, x: 0, y: 0, duration: dur, ease: 'power2.out' }, 0);

      /* 提亮：压暗层同步淡出（纯 opacity，零重算） */
      if (scrim) tl.to(scrim, { opacity: 0, duration: dur * 0.92, ease: 'power2.out' }, 0);
    } catch (e) {
      fallback();
    }
  }

  function play() {
    try {
      /* 1) 把 CSS 起幅固化成内联样式：之后摘掉 js-anim 也不会跳变。
            这一步同步执行，保证首帧画出来的就是起幅 */
      gsap.set(bg, {
        transformOrigin: '50% 46%',
        x: gsap.getProperty(bg, 'x'),
        y: gsap.getProperty(bg, 'y'),
        scale: gsap.getProperty(bg, 'scale')
      });
      if (scrim) {
        var o = parseFloat(window.getComputedStyle(scrim).opacity);
        scrim.style.opacity = isNaN(o) ? 0 : o;
      }
      root.classList.remove('js-anim');

      /* 2) 等渲染真的跟上了再起播：首帧还没落屏时时间线若已经在跑，
            用户睁眼看到的第一帧就会是中段。连续两帧间隔正常（<100ms）
            才认为渲染跟上，此时从 0 起播。 */
      var raf = window.requestAnimationFrame;
      if (raf) {
        var last = 0, born = Date.now();
        (function gate() {
          var now = Date.now();
          var gap = last ? now - last : 9999;
          if (gap < 100 || now - born > 500) { buildTimeline(); return; }
          last = now;
          raf(gate);
        })();
        setTimeout(buildTimeline, 600);      /* 兜底：避免一直停在起幅 */
      } else {
        setTimeout(buildTimeline, 32);
      }
    } catch (e) {
      fallback();
    }
  }

  /* 打开即播：首帧已经是可看的起幅画面，不需要等图片加载 */
  play();
})();
