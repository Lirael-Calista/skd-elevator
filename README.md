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

## 本地预览

```bash
python -m http.server 5173
# 然后打开 http://localhost:5173/
```

直接双击 `index.html` 也能看，但地图等少量功能在 `file://` 下可能不加载。
