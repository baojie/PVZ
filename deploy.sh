#!/bin/bash
set -e

echo "=== PVZ GitHub Pages 构建 ==="

# 必须写成 `npx -p esbuild -- esbuild ...`：
#   - 写成 `npx esbuild app.js ...`，这台机器上的旧 npx 会把 app.js 也当成
#     要装的包名去 npm 上找，然后卡在 node-gyp 编译 contextify 上失败
#   - 再加 --yes 也不行，这个 npx 不认，会装出一堆东西然后 command not found
ESBUILD="npx -p esbuild -- esbuild"

# 先构建到临时目录，全都成功了再换掉 docs/。
# 以前是开头就 rm -rf docs，配上 set -e，中间任何一步挂掉都会把 docs/ 删了
# 却建不回来 —— 已经踩过一次。
OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT

# 打包 + 压缩 JS（ES module → IIFE 单文件）
echo "[1/4] 打包 JS..."
$ESBUILD app.js \
  --bundle \
  --minify \
  --format=iife \
  --outfile="$OUT/app.js"

JS_SIZE=$(du -sh "$OUT/app.js" | cut -f1)
echo "      → docs/app.js ($JS_SIZE)"

# 压缩 CSS
echo "[2/4] 压缩 CSS..."
$ESBUILD style.css \
  --minify \
  --outfile="$OUT/style.css"

CSS_SIZE=$(du -sh "$OUT/style.css" | cut -f1)
echo "      → docs/style.css ($CSS_SIZE)"

# 处理 HTML：去掉 type="module"，引用已压缩的文件
echo "[3/4] 处理 HTML..."
sed \
  -e 's|<script type="module" src="app.js"></script>|<script src="app.js"></script>|g' \
  index.html > "$OUT/index.html"
echo "      → docs/index.html"

# 音频素材：失败时那一声 No（tools/make-no-wav.py 生成）
echo "[4/4] 拷音频..."
if [ -d sounds ]; then
    mkdir -p "$OUT/sounds"
    cp sounds/*.wav "$OUT/sounds/"
    echo "      → docs/sounds/ ($(ls sounds/*.wav | wc -l) 个音频)"
fi

# 到这里全都成功了，才动真正的 docs/
rm -rf docs
mv "$OUT" docs
trap - EXIT

echo ""
echo "构建完成 → docs/"
echo ""
echo "后续步骤："
echo "  1. git add docs/"
echo "  2. git commit -m '构建：发布到 GitHub Pages'"
echo "  3. git push"
echo "  4. 在 GitHub 仓库 Settings → Pages 中将 Source 设为 main 分支 /docs 目录"
