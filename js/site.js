/* ============================================================
   顺凯达官网 · 多页版公共交互
   ------------------------------------------------------------
   原先这些逻辑写在各页内联脚本里，单页时够用；拆成多页后，
   导航、页脚、侧浮在每一页都有一份，脚本再各写一遍必然走形，
   所以统一收在这里，各页只按需引用一次。
   页面与脚本的对应关系：
     · 所有页面：移动端菜单 / 导航滚动态 / 回到顶部 / 滚动显现
     · 首页：数字滚动（.stats-box）
     （原来还有一段「企业介绍页图片轮播 #aboutSlides」，三图轮播已改为单图，
       那段连带内联脚本一并删除，不留空转的定时器。）
   所有逻辑都先判断元素是否存在，缺哪一块就跳过，不会报错。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. 移动端菜单 ---------- */
  var hamburger = document.getElementById('hamburger');
  var nav = document.getElementById('nav');
  if (hamburger && nav) {
    var hud = document.getElementById('header');
    var syncMenuSkin = function () {
      /* 菜单展开时导航条与白色面板连成一块白，避免上面压着照片、下面接白板 */
      if (hud) hud.classList.toggle('menu-open', nav.classList.contains('open'));
    };
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('open');
      nav.classList.toggle('open');
      syncMenuSkin();
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        hamburger.classList.remove('open');
        nav.classList.remove('open');
        syncMenuSkin();
      }
    });
  }

  /* ---------- 2. 导航滚动态 + 回到顶部 ---------- */
  var header = document.getElementById('header');
  var toTop = document.getElementById('toTop');

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (header) header.classList.toggle('scrolled', y > 10);
    if (toTop) toTop.classList.toggle('show', y > 400);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- 3. 数字滚动 ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    var dur = 1600, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(target * eased).toLocaleString('zh-CN');
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString('zh-CN');
    }
    requestAnimationFrame(step);
  }

  /* ---------- 4. 滚动显现 ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        var c = en.target.querySelector('[data-count]');
        if (c && !c.dataset.done) { c.dataset.done = '1'; animateCount(c); }
        if (en.target.classList.contains('stats-box')) {
          var nums = en.target.querySelectorAll('[data-count]');
          Array.prototype.forEach.call(nums, function (n) {
            if (!n.dataset.done) { n.dataset.done = '1'; animateCount(n); }
          });
        }
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    Array.prototype.forEach.call(revealEls, function (el) { io.observe(el); });
    var statsBox = document.querySelector('.stats-box');
    if (statsBox) io.observe(statsBox);
  } else {
    Array.prototype.forEach.call(revealEls, function (el) { el.classList.add('in'); });
    var nums = document.querySelectorAll('[data-count]');
    Array.prototype.forEach.call(nums, function (n) {
      if (!n.dataset.done) { n.dataset.done = '1'; animateCount(n); }
    });
  }

  /* ---------- 5. 联系我们 · 地图 ----------
     原第 6 段是「iframe 抢焦点」的兜底逻辑（高德页面在 iframe 里加载完会
     focus 自己、把页面拽下去）：现在地图已改为静态位置图 + 跳转链接，
     页面上不再有 iframe，那段拦截滚动的代码一并删除，避免残留无效监听。 */

  /* ---------- 6. 企业介绍 ·「实力在岗」四卡选中 ----------
     四张卡做成单选：点一张亮一张，再点同一张取消。只加 class，
     不写内联样式，颜色与位移全部由 css/pages.css 的 .is-active 控制，
     prefers-reduced-motion 那边也就一并管住了。
     键盘：Enter / 空格等同点击，Esc 取消选中并移开焦点。 */
  (function () {
    var wrap = document.getElementById('strength');
    if (!wrap) return;
    var cards = wrap.querySelectorAll('.strength__card');
    if (!cards.length) return;

    function setActive(card, on) {
      card.classList.toggle('is-active', on);
      card.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    function clearAll() {
      Array.prototype.forEach.call(cards, function (c) { setActive(c, false); });
    }

    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener('click', function () {
        /* 用鼠标拖选卡内正文时，浏览器最后也会补一个 click，
           那种情况不该切换选中态，否则一选字就亮一片 */
        var sel = window.getSelection();
        if (sel && String(sel).replace(/\s/g, '').length) return;
        var willOn = !card.classList.contains('is-active');
        clearAll();
        setActive(card, willOn);
      });

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          setActive(card, !card.classList.contains('is-active'));
          if (card.classList.contains('is-active')) {
            Array.prototype.forEach.call(cards, function (c) {
              if (c !== card) setActive(c, false);
            });
          }
        } else if (e.key === 'Escape') {
          clearAll();
          card.blur();
        }
      });
    });
  })();

})();
