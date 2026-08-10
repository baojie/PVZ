#!/bin/bash
set -e

echo "=== PVZ GitHub Pages 构建 ==="

# 清理并创建 docs/
rm -rf docs
mkdir -p docs

# 打包 + 压缩 JS（ES module → IIFE 单文件）
echo "[1/4] 打包 JS..."
npx --yes esbuild app.js \
  --bundle \
  --minify \
  --format=iife \
  --outfile=docs/app.js

JS_SIZE=$(du -sh docs/app.js | cut -f1)
echo "      → docs/app.js ($JS_SIZE)"

# 压缩 CSS
echo "[2/4] 压缩 CSS..."
npx esbuild style.css \
  --minify \
  --outfile=docs/style.css

CSS_SIZE=$(du -sh docs/style.css | cut -f1)
echo "      → docs/style.css ($CSS_SIZE)"

# 处理 HTML：去掉 type="module"，引用已压缩的文件
echo "[3/3] 处理 HTML..."
sed \
  -e 's|<script type="module" src="app.js"></script>|<script src="app.js"></script>|g' \
  index.html > docs/index.html
echo "      → docs/index.html"

# 音频素材：失败时那一声 No（tools/make-no-wav.py 生成）
if [ -d sounds ]; then
    mkdir -p docs/sounds
    cp sounds/*.wav docs/sounds/
    echo "      → docs/sounds/ ($(ls sounds/*.wav | wc -l) 个音频)"
fi

echo ""
echo "构建完成 → docs/"
echo ""
echo "后续步骤："
echo "  1. git add docs/"
echo "  2. git commit -m '构建：发布到 GitHub Pages'"
echo "  3. git push"
echo "  4. 在 GitHub 仓库 Settings → Pages 中将 Source 设为 main 分支 /docs 目录"
