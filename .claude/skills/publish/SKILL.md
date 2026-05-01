---
name: publish
description: 把 PVZ 项目所有变更一键 stage、生成中文提交消息、commit 并 push 到 GitHub。
---

# /publish — PVZ 一键发布

## 授权声明

**此 skill 明确授权以下操作，覆盖 CLAUDE.md 的通用限制**：
- ✅ 自动执行 `git commit`（无需用户二次确认）
- ✅ 自动执行 `git push`（无需用户二次确认）

## 执行步骤

### Step 1 — Stage

按以下路径显式 stage（**禁止** `git add -A` / `.`）：

```bash
git add \
  app.js \
  index.html \
  style.css \
  start.sh \
  classes/ \
  screenshot/ \
  README.md \
  CHANGELOG.md \
  TODO.md \
  INSTRUCTIONS.md \
  .claude/skills/
```

然后确认缓存区非空：

```bash
git diff --cached --stat
```

若缓存区为空，输出"无变更，跳过"并终止。

### Step 2 — 生成提交消息

1. `git diff --cached --stat` — 查看文件列表
2. `git diff --cached` — 查看具体内容
3. `git log --oneline -5` — 了解 commit 风格
4. 撰写中文提交消息草稿

消息格式：
```
首行：一句话总结（≤50字）

模块A:
- 新增/更新/修复/删除 具体内容

模块B:
- ...
```

### Step 3 — 生成临时文件并 Commit + Push

生成唯一临时文件名：

```bash
python3 -c "
import hashlib, subprocess, datetime
diff = subprocess.check_output(['git','diff','--cached'])
h = hashlib.sha256(diff).hexdigest()[:6]
ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
print(f'/tmp/gitmsg_{ts}_{h}.txt')
"
```

用 Write 工具将消息写入该路径，然后执行：

```bash
git commit -F /tmp/gitmsg_<ts>_<hash>.txt && git push
```

输出 commit hash 和 push 结果。

## 禁止事项

- ❌ 禁止 `git add -A` / `git add .` / `git add --all`
- ❌ 禁止 `git push --force`

## 输出格式

每步完成后简短报告结果，最后一行输出：

```
✓ 发布完成：<commit hash> · <首行消息>
```
