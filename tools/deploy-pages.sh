#!/usr/bin/env bash
# 顺凯达官网 → GitHub Pages 一键部署
# 前置：E:/SKD网站/.github-token.txt 里放一行 classic PAT（repo 权限）
# 用法：bash tools/deploy-pages.sh
set -uo pipefail

OWNER="Lirael-Calista"
REPO="skd-elevator"
BRANCH="main"
SITE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TOKEN_FILE="$SITE_DIR/.github-token.txt"

die() { echo "✗ $*" >&2; exit 1; }
ok()  { echo "✓ $*"; }

# ---------- 0. 读令牌 ----------
[ -f "$TOKEN_FILE" ] || die "找不到 $TOKEN_FILE，请先创建并写入令牌"
TOKEN=$(tr -d ' \t\r\n' < "$TOKEN_FILE")
[ -n "$TOKEN" ] || die "令牌文件是空的"
case "$TOKEN" in
  ghp_*|github_pat_*) : ;;
  *) die "令牌格式不对，classic PAT 应以 ghp_ 开头，fine-grained 以 github_pat_ 开头" ;;
esac
ok "令牌已读取（${#TOKEN} 字符）"

CURL="curl -s --ssl-no-revoke --max-time 30"
API="https://api.github.com"
AUTH=(-H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")

# ---------- 1. 验证身份 ----------
LOGIN=$($CURL "${AUTH[@]}" "$API/user" | grep -o '"login": *"[^"]*"' | head -1 | cut -d'"' -f4)
[ "$LOGIN" = "$OWNER" ] || die "令牌属于账号 '$LOGIN'，与目标 $OWNER 不一致"
ok "身份验证通过：$LOGIN"

# ---------- 2. 仓库是否存在，不存在则创建 ----------
CODE=$($CURL -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$API/repos/$OWNER/$REPO")
if [ "$CODE" = "200" ]; then
  ok "仓库已存在，跳过创建"
elif [ "$CODE" = "404" ]; then
  RESP=$($CURL -X POST "${AUTH[@]}" "$API/user/repos" \
    -d "{\"name\":\"$REPO\",\"description\":\"顺凯达电梯官网（静态站）\",\"private\":false,\"has_issues\":true,\"has_wiki\":false}")
  echo "$RESP" | grep -q '"full_name"' || die "创建仓库失败：$RESP"
  ok "仓库已创建（public）"
else
  die "查询仓库返回 $CODE，令牌可能无效或权限不足"
fi

# ---------- 3. 推送 ----------
cd "$SITE_DIR" || die "进不去站点目录"
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO.git"
git remote set-url origin "https://github.com/$OWNER/$REPO.git"

# 用 askpass 传令牌，避免令牌落进 .git/config 或命令历史
export GIT_ASKPASS="$SITE_DIR/tools/.askpass.sh"
export GIT_TERMINAL_PROMPT=0
printf '#!/bin/sh\ncase "$1" in *[Uu]sername*) echo "x-access-token";; *) echo "%s";; esac\n' "$TOKEN" > "$GIT_ASKPASS"
chmod +x "$GIT_ASKPASS"

git push -u origin "$BRANCH" 2>&1 | tail -5
RC=${PIPESTATUS[0]}
rm -f "$GIT_ASKPASS"
[ "$RC" -eq 0 ] || die "推送失败（若提示 403，是令牌缺 repo 写权限）"
ok "代码已推送到 origin/$BRANCH"

# ---------- 4. 开启 Pages ----------
CODE=$($CURL -o /dev/null -w '%{http_code}' "${AUTH[@]}" "$API/repos/$OWNER/$REPO/pages")
if [ "$CODE" = "200" ]; then
  ok "Pages 已开启"
else
  RESP=$($CURL -X POST "${AUTH[@]}" "$API/repos/$OWNER/$REPO/pages" \
    -d "{\"source\":{\"branch\":\"$BRANCH\",\"path\":\"/\"}}")
  echo "$RESP" | grep -qE '"status"|"html_url"' || die "开启 Pages 失败：$RESP"
  ok "Pages 已开启（$BRANCH / 根目录）"
fi

# ---------- 5. 轮询构建 ----------
URL="https://$(echo "$OWNER" | tr '[:upper:]' '[:lower:]').github.io/$REPO/"
echo "等待部署生效：$URL"
for i in $(seq 1 40); do
  sleep 6
  ST=$($CURL "${AUTH[@]}" "$API/repos/$OWNER/$REPO/pages/builds/latest" | grep -o '"status": *"[^"]*"' | head -1 | cut -d'"' -f4)
  LIVE=$($CURL -o /dev/null -w '%{http_code}' -L "$URL")
  echo "  [$i] 构建状态=${ST:-未知}  HTTP=$LIVE"
  [ "$LIVE" = "200" ] && { ok "上线成功：$URL"; rm -f "$TOKEN_FILE"; ok "令牌文件已删除"; exit 0; }
done
die "等了约 4 分钟仍未返回 200，去 Actions / Pages 页面看构建日志"
