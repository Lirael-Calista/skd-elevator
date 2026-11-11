/* ============================================================
   企业介绍页 · 布局脚本
   1) 夜景背景图的高度：算到内容最低点再留一段，收在 3px 封边线上；
   2) 左栏图片框：顶边对齐正文首行、底边对齐正文末行。
   两者相互依赖，所以放在同一个文件里，顺序即执行顺序。
   ============================================================ */
/* 企业介绍背景图：高度 = 内容最低点 + 78px，收在一条 3px 封边线上；
   与下方「电梯服务经营范围」卡片之间由 CSS 的 margin-top 留出呼吸位。
   用 offsetTop 累加（不受 reveal 入场动画位移影响，量到的是排版真实位置） */
(function () {
  var about = document.getElementById('about');
  if (!about) return;
  /* 优先取「联系我们」按钮，找不到依次退回信息条、标题 */
  var anchor = about.querySelector('.about-txt .btn')
            || about.querySelector('.company-meta')
            || about.querySelector('.about-txt h3');

  function offsetWithin(el, root) {
    var y = 0, n = el;
    while (n && n !== root && n !== document.body) {
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return y;
  }

  /* 图底留白：内容最低点（左右两栏取更靠下者）往下再铺 78px。
     顶部（#about 的 60px 内边距 + 标题）与底部是同一幅夜景的两头，
     原来只留 34px，底边明显「收得太急」，画面像被裁断；
     补到 78px 后上下气口相当，夜景的深色块自己站得住，
     封边线也离最后一行方框更远，不会切到内容 */
  var GAP_BOTTOM = 78;
  /* 与下方卡片的保底间距：某些窄屏下卡片 margin 会收窄，这里兜一手，
     任何情况下都至少留 40px 浅底，不会让封边线贴上卡片 */
  var MIN_GAP = 40;

  function setBgHeight() {
    var media = about.querySelector('.about-media');
    var wrapEl = about.querySelector('.about-wrap');
    var scope = about.querySelector('.scope-box');
    var mediaEnd = media ? offsetWithin(media, about) + media.offsetHeight : 0;
    var btnEnd = anchor ? offsetWithin(anchor, about) + anchor.offsetHeight : 0;
    var wrapEnd = wrapEl ? offsetWithin(wrapEl, about) + wrapEl.offsetHeight : 0;
    var contentEnd = Math.max(mediaEnd, btnEnd, wrapEnd);
    var edge = contentEnd + GAP_BOTTOM;
    /* 卡片在的场合：确保图底与卡片上沿之间仍有 MIN_GAP，留白不被内容挤掉 */
    var scopeTop = scope ? offsetWithin(scope, about) : 0;
    if (scopeTop > 0) edge = Math.min(edge, scopeTop - MIN_GAP);
    edge = Math.max(edge, contentEnd + 16);           /* 再低也不能压到内容 */
    about.style.setProperty('--about-bg-h', Math.max(Math.round(edge), 200) + 'px');
  }

  setBgHeight();
  window.__aboutBg = setBgHeight;               /* 供图片对齐脚本在尺寸变化后回调 */
  window.addEventListener('load', setBgHeight);
  window.addEventListener('resize', setBgHeight);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(setBgHeight);
  }
})();

/* 企业介绍：左侧图片框顶对齐正文首行、底对齐正文末行（“并保持着强劲的发展势头”） */
(function(){
  var wrap = document.querySelector('#about .about-wrap');
  if (!wrap) return;
  var img = wrap.querySelector('.about-img');
  var txt = wrap.querySelector('.about-txt');
  if (!img || !txt) return;
  var ps = txt.querySelectorAll('p');
  if (!ps.length) return;

  /* 用 offsetTop 链测量布局位置：不受 .reveal 入场位移（transform）影响，
     量到哪儿就是排版上的真实位置，避免图片被多推下一截 */
  function offsetWithin(el, root){
    var y = 0, n = el;
    while (n && n !== root && n !== document.body) { y += n.offsetTop; n = n.offsetParent; }
    return y;
  }

  function fit(){
    /* 单列堆叠时（栅格只剩一条轨道）图片回到默认高度；
       用实际轨道数判断，断点怎么改都不会错位 */
    var cols = window.getComputedStyle(wrap).gridTemplateColumns.split(' ').length;
    if (window.innerWidth <= 900 || cols < 2) {
      img.style.height = '';
      img.style.marginTop = '';
      img.style.minHeight = '';
    } else {
      var media = wrap.querySelector('.about-media') || txt;
      var base = offsetWithin(media, wrap);   /* 左右两栏同在栅格行首 */
      /* 顶边对齐正文首行「深圳市顺凯达电梯有限公司成立于 2020 年 3 月 4 日」，
         底边对齐末行「……并保持着强劲的发展势头」——图片框高度正好被这两段文案撑开 */
      var firstTop = offsetWithin(ps[0], wrap) - base;
      var lastP = ps[ps.length - 1];
      var lastBottom = offsetWithin(lastP, wrap) + lastP.offsetHeight - base;
      /* 行高含上下半行留白，补偿后图片边缘才与文字墨迹视觉齐平 */
      var cs = window.getComputedStyle(ps[0]);
      var lh = parseFloat(cs.lineHeight) || 32;
      var fs = parseFloat(cs.fontSize) || 18;
      var lead = Math.max(0, Math.round((lh - fs) / 2));
      img.style.minHeight = '0';
      img.style.marginTop = Math.max(0, Math.round(firstTop) + lead) + 'px';
      img.style.height = Math.max(160, Math.round(lastBottom - firstTop - lead * 2)) + 'px';
    }
    /* 图片尺寸确定后重算背景收边，避免夜景边线卡在信息卡底部 */
    if (window.__aboutBg) window.__aboutBg();
  }

  fit();
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(fit); }
  /* 列宽/字号变化会让正文行数改变（图片高度随之作废），用 ResizeObserver 兜底重算 */
  if (window.ResizeObserver) {
    var lastKey = '';
    new ResizeObserver(function () {
      var key = txt.offsetHeight + 'x' + txt.offsetWidth;
      if (key === lastKey) return;
      lastKey = key;
      fit();
    }).observe(txt);
  }
  requestAnimationFrame(fit);
})();
