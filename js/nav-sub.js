/* ============================================================
   导航栏 · 页内快捷菜单
   ------------------------------------------------------------
   鼠标经过任意导航项，都在它下面展开本页 / 该页的标题目录。

   · 当前页对应的那一项：实时扫描本页 DOM 生成（section[id] 含 h2 作一级，
     子块作二级）。标题改了、增删了模块，刷新后菜单自动跟着变。
   · 别的页面对应的项：本页 DOM 里没有对方的内容，改用 js/nav-map.js
     里构建期扫好的清单，链接指向「那个页面 + 锚点」。
   · 层级按真实 DOM 归属：
       一级 = 带 id 且含 <h2> 的 <section>
       二级 = 该 section 里带 id 的子块（.about-block / .case-group / h3[id] 等）
   · 滚动时按「最后一个越过导航下沿的模块」判定当前位置并高亮（仅当前页）。
   ============================================================ */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  if (!nav) return;

  var mqDrawer = window.matchMedia('(max-width: 1080px)');
  var NAV_H = 74;
  (function () {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--nav-h');
    if (v && /px/.test(v)) NAV_H = parseFloat(v) || 74;
  })();

  var MAP = window.NAV_MAP || {};

  /* 二级块的选择器：约定几种写法，页面不必额外加属性。
     · .about-block[id] / .case-group[id]：原有分块
     · .scope-box[id]：首页「电梯服务经营范围」
     · [data-nav-sub][id]：通用标记（联系页、安全科普、资质卡片用它）
     · h3[id]：直接标在标题上的模块 */
  var SUB_SEL = '.about-block[id], .case-group[id], .scope-box[id], [data-nav-sub][id], h3[id]';

  function clean(t) {
    return (t || '').replace(/\s+/g, ' ').trim();
  }
  function titleOf(el) {
    var h = el.querySelector('h2');
    return h ? clean(h.textContent) : '';
  }
  function subTitleOf(el) {
    /* 允许页面用 data-nav-label 指定菜单里显示的名字，
       默认取块里第一个标题（例如联系方式那一栏首条是「公司地址」） */
    var lb = el.getAttribute && el.getAttribute('data-nav-label');
    if (lb) return clean(lb);
    var h = el.querySelector('h2, h3, h4') || el;
    return clean(h.textContent);
  }

  /* ---------- 1. 当前页的标题模块（实时扫描） ---------- */
  var liveItems = null;
  function scanLive() {
    if (liveItems) return liveItems;
    var items = [];

    /* 自带 h2 的 .about-block 是一个独立小节，不是上一节的子项。
       企业介绍页把「实力在岗」「组织架构」「服务网络」三块包在
       「质量保证体系」这个 <section> 里，层级是 DOM 造成的，视觉上四块平级。若照 DOM 当二级，
       它们会多缩进 8px，三行标题就错开了 —— 这里提升为一级，
       菜单里三行同宽同起点，才能严格对齐。
       （.about-block 全站只有企业介绍页在用） */
    var promoted = [].slice.call(document.querySelectorAll('.about-block[id]'))
      .filter(function (b) { return !!b.querySelector('h2'); });

    [].slice.call(document.querySelectorAll('section[id]')).forEach(function (sec) {
      if (sec.closest('header, .header, footer, .footer')) return;

      var title = titleOf(sec);
      if (!title) return;                     /* 首屏这类只有 h1 的区块不进菜单 */

      /* 有些小节只是页名本身（如「联系我们」），它下面挂的两个块其实是
         并列的内容区，不是子目录。这类小节加 data-nav-flat，让这些块
         提升为一级：三行标题同起点、同缩进，视觉上才叫对齐 —— 否则首行
         比后两行靠左 8px，看上去就是「没对齐」而不是「有层级」。 */
      var flat = sec.hasAttribute('data-nav-flat');

      var subs = [], peers = [];
      [].slice.call(sec.querySelectorAll(SUB_SEL)).forEach(function (el) {
        if (el === sec) return;
        if (promoted.indexOf(el) > -1) return;  /* 已提升为一级，不再计入下一级 */
        /* 已经被上一层的二级块包含时跳过，避免同一块出现两次 */
        if (el.parentNode && el.parentNode.closest(SUB_SEL)) return;

        var t = subTitleOf(el);
        if (!t) return;
        if (flat) { peers.push({ id: el.id, text: t, el: el, subs: [] }); return; }
        subs.push({ id: el.id, text: t, el: el });
      });

      items.push({ id: sec.id, text: title, el: sec, subs: subs });
      /* 平级项紧跟在小节后面，保持页面上的先后顺序 */
      peers.forEach(function (it) { items.push(it); });

      /* 紧跟在所属小节后面补上被提升的块，保持页面上的先后顺序 */
      promoted.forEach(function (b) {
        if (b.closest('section[id]') !== sec) return;
        items.push({ id: b.id, text: subTitleOf(b), el: b, subs: [] });
      });
    });

    /* 只有一项、且没有二级的页面（证书详情）不挂菜单：
       那种菜单点开只有一行，点它等于回到页顶，反而添乱。 */
    var total = 0;
    items.forEach(function (it) { total += 1 + it.subs.length; });
    liveItems = total < 2 ? [] : items;
    return liveItems;
  }

  /* ---------- 2. 页面文件名 → 菜单归属 ---------- */
  function pageKey(href) {
    if (!href) return '';
    if (href.charAt(0) === '#') return 'index.html';   /* 首页的「首页」是 #home */
    var m = href.match(/([^\/?#]+\.html)(?:[?#]|$)/);
    return m ? m[1] : '';
  }
  var curKey = pageKey(location.pathname.split('/').pop() || 'index.html');
  var inRoot = !/\/pages\//.test(location.pathname);   /* 目录深度决定跨页链接前缀 */

  function crossHref(key, id) {
    if (key === 'index.html') return (inRoot ? '' : '../') + 'index.html#' + id;
    return (inRoot ? 'pages/' : '') + key + '#' + id;
  }

  /* ---------- 3. 给每个导航项挂一块面板 ---------- */
  var panels = [];

  function buildPanel(link, data, isLive, key) {
    var sub = document.createElement('div');
    sub.className = 'nav-sub' + (isLive ? '' : ' nav-sub--static');
    sub.id = isLive ? 'navSub' : 'navSub-' + key.replace(/\.html$/, '');

    var panel = document.createElement('div');
    panel.className = 'nav-sub__panel';
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', isLive ? '本页标题快捷导航' : '该页标题快捷导航');

    /* 列表单独一层：面板负责描边与尖角，列表负责滚动，
       这样模块很多时出现滚动条也不会把小尖角裁掉 */
    var list = document.createElement('div');
    list.className = 'nav-sub__list';
    panel.appendChild(list);
    sub.appendChild(panel);

    var registry = [];

    function makeLink(it, isSub, rootId) {
      var a = document.createElement('a');
      a.className = 'nav-sub__link' + (isSub ? ' nav-sub__link--sub' : '');
      a.href = isLive ? '#' + it.id : crossHref(key, it.id);
      a.setAttribute('role', 'menuitem');
      a.setAttribute('data-target', it.id);

      var txt = document.createElement('span');
      txt.className = 'nav-sub__txt';
      txt.textContent = it.text;

      a.appendChild(txt);
      list.appendChild(a);
      registry.push({ id: it.id, el: it.el || null, node: a, root: rootId || null });
    }

    data.forEach(function (it) {
      makeLink(it, false, null);
      it.subs.forEach(function (s) { makeLink(s, true, it.id); });
    });

    link.parentNode.insertBefore(sub, link.nextSibling);
    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-expanded', 'false');
    if (isLive) link.classList.add('has-sub');

    var p = { link: link, sub: sub, panel: panel, list: list, registry: registry, live: isLive, key: key };
    panels.push(p);
    return p;
  }

  [].slice.call(nav.querySelectorAll('a[href]')).forEach(function (link) {
    var key = pageKey(link.getAttribute('href'));
    if (!key) return;

    var isLive = key === curKey;
    var data = isLive ? scanLive() : (MAP[key] || null);
    if (!data || !data.length) return;

    buildPanel(link, data, isLive, key);
  });

  if (!panels.length) return;

  var livePanel = null;
  panels.forEach(function (p) { if (p.live) livePanel = p; });

  /* 抽屉里的小箭头：只给「当前页」那一项（抽屉里别的项点了就是跳页，
     再往下摊一层目录会把这个列表撑得很长） */
  if (livePanel) {
    var caret = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    caret.setAttribute('class', 'nav-sub__caret');
    caret.setAttribute('viewBox', '0 0 24 24');
    caret.setAttribute('aria-hidden', 'true');
    caret.innerHTML = '<path d="M6 9l6 6 6-6"/>';
    livePanel.link.appendChild(caret);
  }

  /* ---------- 4. 面板落点 ---------- */
  /* 顶边落在导航条下沿往下 6px，水平居中对齐当前导航项，左右各留 8px
     余量——否则靠右的「项目案例」展开时会顶出视口。
     注意 .nav-sub 的定位祖先是 .header（导航项是它的兄弟，不是包含块），
     所以这里全部按 header 的视口矩形换算成像素写进去。 */
  function place(p) {
    if (mqDrawer.matches) {
      p.sub.style.top = '';
      p.sub.style.left = '';
      p.sub.style.paddingTop = '';
      return;
    }
    var header = p.link.closest('.header') || document.querySelector('.header');
    if (!header) return;

    var hb = header.getBoundingClientRect();
    var ab = p.link.getBoundingClientRect();
    var w = p.sub.offsetWidth || 200;

    var left = ab.left - hb.left + ab.width / 2;
    left = Math.min(Math.max(left, w / 2 + 8), hb.width - w / 2 - 8);

    p.sub.style.top = Math.round(ab.bottom - hb.top) + 'px';
    p.sub.style.left = Math.round(left) + 'px';
    p.sub.style.paddingTop = Math.max(6, Math.round(hb.bottom - ab.bottom + 6)) + 'px';
  }
  function placeAll() { panels.forEach(place); }

  /* 先把每块面板的落点一次算好（7 块，一次性强制布局，开销可忽略），
     悬停时就不必再量——鼠标一进去直接开始动画，不耽误那一帧。 */
  placeAll();

  /* ---------- 5. 展开 / 收起 ---------- */
  /* 悬停展开不靠 CSS :hover —— 那样子元素一离开就立刻收，
     鼠标斜着挪进面板时会在半路闪一下。这里用「进就开、出就等一会」，
     面板上那条 padding-top 过渡带兜住中间的缝隙，全程不中断。
     同时开着的只留一块：从「首页」划到「企业介绍」，上一块立刻收、下一块立刻开。 */
  var opened = null;
  var closeTimer = null;

  function show(p) {
    clearTimeout(closeTimer);
    if (opened === p) return;
    if (opened) hide(opened);
    /* 每次展开前重算一次落点：导航条里的 logo / 按钮在字体或图片到位后
       会轻微换位，预先算好的 left 会旧；这里只量一个小元素，代价可忽略，
       但保证了「永远是现在这个位置」。顺带强制读布局，让浏览器先把
       「收起态」的起始帧算出来再挂 is-open —— 否则首次悬停时起始帧
       尚未生成，过渡会被跳过，面板直接跳到终态，观感就是「生硬闪现」。 */
    place(p);
    void p.sub.offsetWidth;
    p.sub.classList.add('is-open');
    p.link.classList.add('is-subopen');
    p.link.setAttribute('aria-expanded', 'true');
    opened = p;
  }
  function hide(p) {
    p.sub.classList.remove('is-open');
    p.link.classList.remove('is-subopen');
    p.link.setAttribute('aria-expanded', 'false');
    if (opened === p) opened = null;
  }
  function hideSoon(p) {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () { hide(p); }, 140);
  }
  function hideAll() { panels.forEach(hide); }

  panels.forEach(function (p) {
    p.link.addEventListener('mouseenter', function () {
      if (!mqDrawer.matches) show(p);
    });
    p.link.addEventListener('mouseleave', function () {
      if (!mqDrawer.matches) hideSoon(p);
    });
    p.sub.addEventListener('mouseenter', function () {
      if (!mqDrawer.matches) show(p);
    });
    p.sub.addEventListener('mouseleave', function () {
      if (!mqDrawer.matches) hideSoon(p);
    });

    /* 键盘：Tab 到导航项展开，焦点离开这一整块再收 */
    p.link.addEventListener('focus', function () {
      if (!mqDrawer.matches) show(p);
    });
    p.link.addEventListener('blur', function (e) {
      if (mqDrawer.matches) return;
      var to = e.relatedTarget;
      if (to && (to === p.link || p.sub.contains(to))) return;
      hide(p);
    });
    p.sub.addEventListener('focusout', function (e) {
      if (mqDrawer.matches) return;
      var to = e.relatedTarget;
      if (to && (p.sub.contains(to) || to === p.link)) return;
      hide(p);
    });

    /* 抽屉里点「当前页」那一项：不重新加载本页，改成展开/收起子菜单。
       必须 stopPropagation：site.js 在 #nav 上挂了一个「点任意 a 就收抽屉」
       的监听，不拦住的话这一下会先把整个抽屉关掉，子目录刚展开就跟着消失。 */
    if (p.live) {
      p.link.addEventListener('click', function (e) {
        if (!mqDrawer.matches) return;
        e.preventDefault();
        e.stopPropagation();
        if (p.sub.classList.contains('is-open')) hide(p);
        else show(p);
      });
    }
  });

  /* ---------- 6. 跳转 ---------- */
  /* 文档坐标用 offsetTop 链累加：.reveal 未进场时带 28px 的 translateY，
     直接拿 getBoundingClientRect 会把落点算高 28px（目标被导航条啃掉一截）。 */
  function docTop(el) {
    var y = 0, n = el;
    while (n && n !== document.body) {
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return y;
  }

  function goTo(id) {
    var el = document.getElementById(id);
    if (!el) return;

    el.classList.add('in');                   /* 先把入场位移收掉，落点才准 */
    var y = docTop(el) - (NAV_H + 12);
    pinnedId = id;                            /* 点哪项就先亮哪项 */
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    sync();

    hideAll();
    if (mqDrawer.matches && nav.classList.contains('open')) {
      var hb = document.getElementById('hamburger');
      if (hb) hb.click();                     /* 交给 site.js 收抽屉，顺带解锁滚动 */
    }
  }

  panels.forEach(function (p) {
    p.panel.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('.nav-sub__link') : null;
      if (!a) return;
      if (p.live) {
        /* 本页的目录：平滑滚动到模块，不跳页 */
        e.preventDefault();
        goTo(a.getAttribute('data-target'));
      } else {
        /* 别的页面的目录：href 已经是「页面 + 锚点」，交给浏览器跳 */
        hide(p);
      }
    });
  });

  /* 键盘：Esc 全部收起 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideAll();
  });

  /* ---------- 7. 当前模块高亮（仅当前页） ---------- */
  var currentId = null;
  var ticking = false;
  /* 刚点过的那一项：卡片网格里同一行的几项垂直位置相同，
     光按位置判断会落到行内第一张卡上（点「维保质量」却亮「作业人员」）。
     点过之后先认这一项，等用户自己滚动（滚轮 / 触摸 / 方向键）再交回位置判断。 */
  var pinnedId = null;

  function sync() {
    if (!livePanel) return;

    var probe = NAV_H + 26;
    var found = null;
    var foundTop = -Infinity;
    livePanel.registry.forEach(function (r) {
      if (!r.el) return;
      /* 取「最后一个越过导航下沿的模块」；卡片网格里同一行的几项 top 相同，
         用 > 比较让先出现的那个赢，否则高亮会跳到一行的最后一张卡上 */
      var t = r.el.getBoundingClientRect().top - probe;
      if (t <= 0 && t > foundTop) { foundTop = t; found = r.id; }
    });
    if (pinnedId) found = pinnedId;

    if (found === currentId) return;
    currentId = found;

    /* 先全体归零，再给命中的那一项点亮；父项只在二级命中时透个淡色 */
    livePanel.registry.forEach(function (r) {
      r.node.classList.remove('is-current', 'is-current-root');
    });

    var cur = null;
    livePanel.registry.forEach(function (r) {
      if (r.id === currentId) cur = r;
    });
    if (cur) {
      cur.node.classList.add('is-current');
      if (cur.root) {
        var parentLink = livePanel.panel.querySelector('.nav-sub__link[data-target="' + cur.root + '"]');
        if (parentLink) parentLink.classList.add('is-current-root');
      }
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      sync();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { placeAll(); onScroll(); });
  window.addEventListener('load', placeAll);        /* 字体到位后菜单宽度可能变 */
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(placeAll);
  }

  /* 用户自己滚动起来就把「点过的那一项」交还给位置判断 */
  function releasePin() {
    if (!pinnedId) return;
    pinnedId = null;
    onScroll();
  }
  ['wheel', 'touchmove'].forEach(function (ev) {
    window.addEventListener(ev, releasePin, { passive: true });
  });
  window.addEventListener('keydown', function (e) {
    if (/^(Arrow|Page|Home|End| |Spacebar)/.test(e.key)) releasePin();
  });

  /* 抽屉 ↔ 桌面切换时把展开态归零、重算落点，避免残留 */
  function onModeChange() {
    hideAll();
    placeAll();
  }
  if (mqDrawer.addEventListener) mqDrawer.addEventListener('change', onModeChange);
  else if (mqDrawer.addListener) mqDrawer.addListener(onModeChange);

  sync();
})();
