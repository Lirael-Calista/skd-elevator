# 顺凯达电梯官网（SKD）

纯静态站点，共 12 个页面，无构建步骤、无外部依赖安装。直接推送即可访问。

## 目录结构

```
index.html          首页
pages/*.html        内页（关于、业务、案例、资质、安全、联系等 11 页）
css/                样式（style.css 首页共用、pages.css 内页、nav-sub.css 导航下拉等）
js/                 脚本（site.js、nav-map.js、nav-sub.js、lift-demo.js、hero-intro.js、map.js）
assets/             图片与本地化的 Leaflet 地图库
tools/              图片生成脚本（仅本地使用，不参与部署）
.nojekyll           关闭 GitHub Pages 的 Jekyll 处理，避免多余构建
```

## 为什么可以直接用分支部署

- 所有资源引用都是**相对路径**（`assets/…`、`../css/…`），不含以 `/` 开头的根路径引用，
  因此放在 `https://<用户名>.github.io/<仓库名>/` 这种子路径下也能正常加载。
- 没有构建产物，仓库根目录就是网站根目录。

## GitHub Pages 设置（一次性）

1. 仓库 **Settings → Pages**
2. **Source** 选择 `Deploy from a branch`
3. **Branch** 选 `main`，目录选 `/ (root)`，保存
4. 等待 1–3 分钟，地址为 `https://<用户名>.github.io/<仓库名>/`

补充说明：

- 首次部署从保存设置开始计时，通常 1 分钟出首个版本；之后每次 push 到 `main` 约 30 秒–2 分钟重建。
- `?v=YYYYMMDDx` 是 CSS/JS 的缓存版本串，改样式或脚本后必须同步更新所有 HTML 里的版本号，
  否则浏览器（和 Pages 的 CDN）可能继续用旧文件。
- 若后续想改用 Actions 部署，把 Source 切成 `GitHub Actions` 并加入
  `.github/workflows/deploy.yml`（`actions/upload-pages-artifact` + `actions/deploy-pages`）即可，
  当前分支部署模式不需要该文件。

## 日常更新（改完内容就两条命令）

```bash
cd "E:/SKD网站"
git add -A && git commit -m "说明改了什么" && git push
```

推送后 30 秒–2 分钟自动重建，不用再进仓库设置页。

**改了 css/ 或 js/ 的话**：同步把 12 个 HTML 里的 `?v=` 版本串换掉（如 `?v=20261111k` → 新日期），
否则线上仍是旧样式。批量改法：Python 正则 `((?:href|src)=")([^"?:]+\.(?:css|js))(")` → 追加 `?v=`。

## 推送认证（已配置 SSH，无需令牌）

- 密钥：`~/.ssh/id_ed25519_skd`（ed25519，无口令），公钥已加到 GitHub 账号。
- 本机 22 端口被运营商拦截，故 `~/.ssh/config` 里把 github.com 指向 `ssh.github.com:443`。
- 远程地址用 SSH 形式：`git@github.com:Lirael-Calista/skd-elevator.git`。
- 验证连通：`ssh -T git@github.com`，出现 `Hi Lirael-Calista!` 即正常。

**仅在 SSH 不可用时**才回退到 HTTPS + 临时令牌（令牌需 `repo` 权限，用完即删）：
本机还需 `git config --global http.schannelCheckRevoke false`，否则 `schannel` 吊销检查超时会报 TLS 失败；
`git push` 前必须加 `-c credential.helper=`，否则会被 Windows 凭据管理器的弹窗卡死无输出。

## 部署排查手册

| 现象 | 原因 | 处理 |
|---|---|---|
| 站点 404 | Pages 没开 / 分支名不对 / 刚推送还没构建完 | 看 Settings→Pages 与 Actions 无关的构建历史，等 1–2 分钟 |
| 页面能开但没样式 | 资源用了 `/` 开头的根路径引用 | 改相对路径（子路径站点必须） |
| 样式没变 | `?v=` 版本串没换，浏览器用了缓存 | 换版本串后强刷 Ctrl+F5 |
| push 403 | 令牌缺 `repo` 权限 | 重新生成并勾选顶级 `repo` |
| push 无反应卡住 | 凭据管理器弹窗 | `git -c credential.helper= push` |
| TLS/吊销检查报错 | 本机 schannel 吊销服务器不通 | `http.schannelCheckRevoke=false` + `curl --ssl-no-revoke` |

## 站点附加文件（GitHub Pages 专用）

| 文件 | 作用 | 改动注意 |
|---|---|---|
| `404.html` | 访问不存在的地址时的自定义页面（放仓库根目录 GitHub 自动接管） | 里面链接是**绝对路径** `/skd-elevator/…`，因为 404 会在任意层级渲染，相对路径会算错 |
| `robots.txt` | 放行爬虫 + 声明 sitemap 地址 | 含完整域名 |
| `sitemap.xml` | 12 个页面的收录清单 | 含完整域名 |
| `favicon.ico` / `favicon-32.png` / `apple-touch-icon.png` | 标签页与手机桌面图标 | 由 `tools/make_favicon.py` 从 `assets/logo-mark.png` 生成，换商标后重跑脚本 |
| `CNAME` | **仅在绑定自定义域名时**才需要 | 目前没有，不加；误加会让站点 404 |

**若日后绑定自有域名**（如 `www.xxx.com` 指向站点根），必须同步改三处：

1. `404.html` 里全部 `/skd-elevator/` 前缀 → `/`
2. `robots.txt` 的 `Sitemap:` 行
3. `sitemap.xml` 里每一条 `<loc>`

重新生成图标：

```bash
python tools/make_favicon.py
```

## 本地预览



```bash
python -m http.server 5173
# 然后打开 http://localhost:5173/
```

直接双击 `index.html` 也能看，但地图等少量功能在 `file://` 下可能不加载。
