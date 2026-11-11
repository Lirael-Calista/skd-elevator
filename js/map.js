/* ============================================================
   联系我们 · 交互式位置地图
   ------------------------------------------------------------
   为什么不用 <iframe src="amap.com/place/...">：
     高德网页端在未登录时会弹登录/扫码墙，iframe 里同样被拦，
     地图根本不可操作。这是高德网页自己的限制，改不掉。
   这里的做法：
     底图直接取高德的公开栅格瓦片（webrd0x.is.autonavi.com），
     由 Leaflet 在本地拼装，拖动 / 滚轮 / 双击 / 双指捏合全部可用。
     整个过程不加载高德的网页、不调用需要 Key 的 JS API，
     因此不需要账号、不需要 Key，也就不会有登录墙。
   坐标：公司坐标准确值是高德坐标系（GCJ-02），
        与上面的瓦片同一套坐标，直接使用即可，不需要再纠偏。
   ============================================================ */
(function () {
  'use strict';

  var box = document.getElementById('companyMap');
  if (!box || !window.L) return;

  var POS = [22.698694, 114.234087];        /* 名居广场 5 栋 C 座 · GCJ-02 */
  var TILE = 'https://webrd0{s}.is.autonavi.com/appmaptile' +
             '?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
  /* 1×1 透明 GIF：单块瓦片取不到时用它占位，避免出现破图图标，
     底下那张静态位置图会顶上来兜底 */
  var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  var map = L.map(box, {
    center: POS,
    zoom: 17,
    minZoom: 11,          /* 可以一路缩到能看见整个深圳，方便判断方位 */
    maxZoom: 18,
    zoomControl: false,           /* 自放到右上角，避开左上角的目光落点 */
    attributionControl: false,    /* 版权改由底部浮条统一署名 */
    scrollWheelZoom: false,       /* 先关：避免鼠标划过就把整页滚动抢走，点一下再开 */
    keyboard: false,              /* 不抢方向键，页面照常可用键盘滚动 */
    zoomSnap: 0.5                 /* 滚轮一格半档，缩放不那么跳 */
  });

  L.control.zoom({ position: 'topright', zoomInTitle: '放大', zoomOutTitle: '缩小' }).addTo(map);

  L.tileLayer(TILE, {
    subdomains: ['1', '2', '3', '4'],
    minZoom: 11,          /* 与地图一致：11 档能看见整个深圳，18 档是瓦片最细一档 */
    maxZoom: 18,
    errorTileUrl: BLANK,
    className: 'amap-tile'
  }).addTo(map);

  var pin = L.divIcon({
    className: 'map-pin-wrap',
    html: '<svg class="map-pin-ico" viewBox="0 0 44 56" aria-hidden="true" focusable="false">' +
            '<ellipse cx="22" cy="53" rx="9.5" ry="3.6" fill="#141a3c" opacity=".22"/>' +
            '<path d="M22 2.5C11.6 2.5 3.5 10.8 3.5 21.2 3.5 34 22 53.5 22 53.5S40.5 34 40.5 21.2C40.5 10.8 32.4 2.5 22 2.5Z" fill="#f26a21" stroke="#fff" stroke-width="3.2"/>' +
            '<circle cx="22" cy="20.5" r="7.2" fill="#fff"/>' +
          '</svg>',
    iconSize: [44, 56],
    iconAnchor: [22, 56]
  });

  L.marker(POS, { icon: pin, title: '深圳市顺凯达电梯有限公司', riseOnHover: true })
    .addTo(map)
    .bindTooltip(
      '<em>公司位置</em>' +
      '<strong>深圳市顺凯达电梯有限公司</strong>' +
      '<span>龙岗区龙城街道 · 名居广场 5 栋 C 座 3008</span>',
      {
        permanent: true,
        direction: 'top',
        offset: [0, -52],
        className: 'map-card',
        opacity: 1,
        interactive: false
      }
    )
    .openTooltip();

  /* 滚轮缩放的开关：点一下地图才接管滚轮，鼠标移出就交还给页面。
     触屏上不涉及滚轮，双指捏合始终有效。 */
  box.addEventListener('click', function () {
    if (!map.scrollWheelZoom.enabled()) {
      map.scrollWheelZoom.enable();
      box.classList.add('is-active');
    }
  });
  box.addEventListener('mouseleave', function () {
    if (map.scrollWheelZoom.enabled()) {
      map.scrollWheelZoom.disable();
      box.classList.remove('is-active');
    }
  });

  /* 单列布局下地图框会被拉成一条扁带，尺寸变化后必须让 Leaflet 重算 */
  var fix = function () { map.invalidateSize(); };
  if (window.ResizeObserver) {
    new ResizeObserver(fix).observe(box);
  } else {
    window.addEventListener('resize', fix);
  }
  window.addEventListener('load', fix);
  setTimeout(fix, 300);

  /* 首次进页面时把地图钉在当前视野（reveal 动画期间尺寸可能还在变） */
  map.setView(POS, 17, { animate: false });
  setTimeout(function () { map.setView(POS, 17, { animate: false }); }, 350);
})();
