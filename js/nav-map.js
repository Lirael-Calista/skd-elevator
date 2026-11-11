/* ============================================================
   导航栏 · 各页标题模块清单（静态）
   ------------------------------------------------------------
   首页的导航项只吊着「首页」自己的目录，鼠标移到「企业介绍」
   这类别的页面上时本页 DOM 里没有对方的内容，所以按这份清单
   生成跨页下拉。当前页仍然用脚本实时扫描 DOM，标题改了立刻
   生效；这份清单只负责别的页面，标题有变动时重新生成即可。

   本文件是「快照」：某页新增/改名/删除了标题模块时，重新扫一遍
   各页的 section[id] + h2（与 nav-sub.js 的选择器同一套），覆盖这里即可；
   当前页不受影响——当前页永远是实时扫描的。

   格式：{ "<页面文件名>": [ { id, text, subs: [{ id, text }] } ] }
   ============================================================ */
window.NAV_MAP = {
  "index.html": [{"id":"about","text":"公司概况","subs":[{"id":"scope","text":"电梯服务经营范围"}]},{"id":"process","text":"服务流程","subs":[]}],
  "about.html": [{"id":"profile","text":"质量保证体系","subs":[]},{"id":"strength","text":"实力在岗","subs":[]},{"id":"org","text":"组织架构","subs":[]},{"id":"network","text":"服务网络","subs":[]}],
  "services.html": [{"id":"services","text":"业务范围","subs":[]},{"id":"maintenance","text":"维保周期","subs":[]},{"id":"monitor","text":"电梯在跑，我们在看","subs":[]},{"id":"process","text":"从需求到年检的服务路径","subs":[]}],
  "cases.html": [{"id":"cases","text":"项目案例","subs":[]},{"id":"case-mall","text":"商业综合体","subs":[]},{"id":"case-residential","text":"住宅小区","subs":[]},{"id":"case-medical","text":"医疗教育","subs":[]},{"id":"case-industrial","text":"工业厂房","subs":[]}],
  "qualification.html": [{"id":"qualification","text":"资质展示","subs":[]},{"id":"qual-produce-card","text":"特种设备资质","subs":[]},{"id":"qual-business-card","text":"工商登记","subs":[]},{"id":"qual-tax","text":"纳税信用","subs":[]},{"id":"creditQualCard","text":"信用资质","subs":[]},{"id":"qual-staff","text":"作业人员","subs":[]},{"id":"qual-maint","text":"维保质量","subs":[]},{"id":"qual-archive","text":"档案管理","subs":[]},{"id":"qual-association-card","text":"行业身份","subs":[]}],
  "safety.html": [{"id":"safety","text":"电梯安全科普","subs":[]},{"id":"safe-ride","text":"安全乘梯要点","subs":[]},{"id":"safe-trap","text":"被困电梯怎么办","subs":[]},{"id":"safe-maint","text":"使用与维保常识","subs":[]},{"id":"safe-assess","text":"老旧电梯何时做安全评估","subs":[]}],
  "contact.html": [{"id":"contact","text":"联系我们","subs":[]},{"id":"contact-way","text":"联系方式","subs":[]}]
};
