/* ============================================================
   SKD 智能梯控演示（1F–30F）
   首页「运行保障」横带与二级页 smart-lift.html 共用
   用法：SKD_LIFT({ shaft:'bandShaft', car:'bandCar', seq:[1,30,1], move:4200, hold:900 });
   ============================================================ */
(function () {
  'use strict';

  var TOTAL = 30;
  var MS = [1, 5, 10, 15, 20, 25, 30];   // 里程碑楼层

  function easeInOut(p) {
    return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  }

  function init(cfg) {
    var shaft = document.getElementById(cfg.shaft);
    var car = document.getElementById(cfg.car);
    if (!shaft || !car) return;

    var floorEl = cfg.floor ? document.getElementById(cfg.floor) : null;
    var stateEl = cfg.state ? document.getElementById(cfg.state) : null;
    var targetEl = cfg.target ? document.getElementById(cfg.target) : null;

    var step = cfg.move || 3200;
    var hold = cfg.hold || 900;
    var seq = cfg.seq || [1, 30, 1];
    var cur = cfg.start || seq[0];

    /* ---------- 位置换算：井道自下而上均分 7 段 ---------- */
    function seg(i, H) { return (i / MS.length) * H; }
    function floorPos(f, H) {
      if (f <= MS[0]) return 0;
      if (f >= TOTAL) return seg(MS.length - 1, H);
      for (var i = 0; i < MS.length - 1; i++) {
        if (f >= MS[i] && f <= MS[i + 1]) {
          var t = (f - MS[i]) / (MS[i + 1] - MS[i]);
          return seg(i, H) + t * (seg(i + 1, H) - seg(i, H));
        }
      }
      return 0;
    }

    /* ---------- 构建刻度线与里程碑标签 ---------- */
    var lines = [], nodes = [];
    for (var f = 1; f <= TOTAL; f++) {
      if (MS.indexOf(f) !== -1) continue;
      var d = document.createElement('div');
      d.className = 'floor';
      shaft.appendChild(d);
      lines.push({ el: d, f: f });
    }
    MS.forEach(function (f, i) {
      var m = document.createElement('div');
      m.className = 'milestone';
      var b = document.createElement('b');
      b.textContent = f + 'F';
      m.appendChild(b);
      shaft.appendChild(m);
      nodes.push({ el: m, f: f, i: i });
    });

    car.style.transition = 'none';   /* 位置由 rAF 逐帧计算，避免 CSS 过渡与楼层数字脱节 */

    /* ---------- 尺寸：一格里程碑高 = 轿厢高 ----------
       井道被 7 个里程碑均分成 7 段，每段 H/7。轿厢高度直接锁到这一段：
       停到某层时车身恰好占满该层、底部落在该层那条线上，不会多占上面一格，
       也不会悬空。高度用 JS 写内联样式，只作用于动画中的这台，不影响别处。 */
    function layout() {
      var H = shaft.clientHeight;
      car.style.height = (H / MS.length) + 'px';
      lines.forEach(function (o) { o.el.style.bottom = (floorPos(o.f, H) / H * 100) + '%'; });
      nodes.forEach(function (o) { o.el.style.bottom = (o.i / MS.length * 100) + '%'; });
      setTop(cur);
    }

    function setTop(f) {
      var H = shaft.clientHeight;
      /* 车高用同一套算式（H/7）反算，而不是读 offsetHeight —— 后者会被取整，
         7 段除不尽时每格差零点几像素，跑几趟就能看出车底与线错开 */
      var top = H - floorPos(f, H) - H / MS.length;
      if (top < 0) top = 0;
      car.style.top = top + 'px';
    }

    function setActive(f) {
      nodes.forEach(function (o) { o.el.classList.toggle('active', o.f === f); });
    }

    /* ---------- 开门 / 关门 ----------
       到站给 .car 挂 arrived：两扇门向门套里滑开、门缝淡掉、门上的 SKD 一起淡下去，
       中间露出车身那道浅底当「舱内的光」；0.66 秒后自动关门。
       和状态文字的「开门中…」是同一件事，不然那三个字没有对应的画面。 */
    var doorTimer = null;
    function openDoors() {
      car.classList.add('arrived');
      clearTimeout(doorTimer);
      doorTimer = setTimeout(function () { car.classList.remove('arrived'); }, 660);
    }
    function closeDoors() {
      clearTimeout(doorTimer);
      car.classList.remove('arrived');
    }

    /* ---------- 单趟运行 ----------
       逐帧推进改用 requestAnimationFrame：原来 setInterval(30) 只有 33fps，
       3.4 秒跑完一层楼的行程里能看出格子一跳一跳；rAF 跟屏幕同频，顺势推上去。
       极端环境没有 rAF 就退回定时器；标签页切走时 rAF 自己暂停，
       回来时 p 由 performance.now 重算，位置不会错。 */
    var raf = null, tickTimer = null, useRaf = !!window.requestAnimationFrame;

    function stopTick() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (tickTimer) { clearTimeout(tickTimer); tickTimer = null; }
    }
    function nextTick(fn) {
      if (useRaf) raf = requestAnimationFrame(fn);
      else tickTimer = setTimeout(fn, 30);
    }

    function goTo(target, done) {
      if (target === cur) { done && done(); return; }
      if (stateEl) stateEl.textContent = target > cur ? '上行 ↑' : '下行 ↓';
      if (targetEl) targetEl.textContent = target + 'F';

      var from = cur;
      cur = target;

      setActive(null);                 /* 运行途中不点亮楼层标签，到站再高亮 */
      closeDoors();                    /* 起步前先把门带上 */

      var t0 = performance.now();
      stopTick();

      function finish() {
        raf = null; tickTimer = null;
        setTop(target);
        if (floorEl) floorEl.textContent = target;
        setActive(target);
        openDoors();
        if (stateEl) {
          stateEl.textContent = '开门中…';
          setTimeout(function () { stateEl.textContent = '待机'; }, 900);
        }
        done && done();
      }

      function tick() {
        var p = Math.min(1, (performance.now() - t0) / step);
        var f = from + (target - from) * easeInOut(p);
        setTop(f);
        if (floorEl) floorEl.textContent = Math.round(f);
        if (p >= 1) finish();
        else nextTick(tick);
      }
      nextTick(tick);
    }

    /* ---------- 循环 ---------- */
    var visible = true, idx = 0, timer = null, busy = false;

    function schedule(ms) { clearTimeout(timer); timer = setTimeout(loop, ms); }

    function loop() {
      timer = null;
      if (!visible || busy) return;         // 滚出视口后暂停，省电
      idx = (idx + 1) % seq.length;
      busy = true;
      goTo(seq[idx], function () {
        busy = false;
        if (visible) schedule(hold);
      });
    }

    layout();
    setActive(cur);

    /* 窄屏不做动画：只定格一个静态示意图（楼层数字与状态一并落到定格层，
       否则轿厢停在 15F、右上方却还写着 1F） */
    var isNarrow = window.matchMedia('(max-width:640px)');
    if (isNarrow.matches && cfg.mobileStatic !== false) {
      cur = cfg.staticFloor || 15;
      setActive(cur);
      setTop(cur);
      if (floorEl) floorEl.textContent = cur;
      if (stateEl) stateEl.textContent = '待机';
      if (targetEl) targetEl.textContent = cur + 'F';
      return;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible = en.isIntersecting;
          if (visible && timer === null && !busy) loop();
        });
      }, { threshold: 0.15 }).observe(shaft);
    }
    schedule(hold);

    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(layout, 160);
    });
  }

  window.SKD_LIFT = init;
})();
