---
name: commit
description: 把项目当前所有变更按内容分组，一组一组地调用 /msg 生成提交消息并输出 git commit 命令，由用户逐组执行后再继续下一组。
---

# /commit — 分组提交助手

## 工作原理

每次调用 `/commit` 只处理**一组**变更：

1. 用 `git status` 扫描当前所有未提交变更（staged + unstaged + untracked）
2. 若无变更 → 输出"无未提交变更"并退出
3. 将变更按**内容领域**分组（见"分组策略"）
4. 展示完整分组计划（首次）或当前剩余组（后续调用）
5. 取**第一组**，执行 `/msg` 流程（stage → 生成消息 → 写临时文件）
6. 输出 `git commit -F <tmpfile>` 命令
7. 告知用户执行该命令后再次调用 `/commit` 处理下一组

用户工作流：`/commit` → 执行命令 → `/commit` → 执行命令 → … 直到所有组完成。

## 分组策略

按以下顺序判断，一个文件只属于一组：

| 优先级 | 组名 | 匹配规则 |
|--------|------|----------|
| 1 | **skills** | `.claude/skills/` 下的文件 |
| 2 | **classes** | `classes/` 下的 `.js` 文件 |
| 3 | **js** | 根目录 `app.js` 及其他 `.js` 文件 |
| 4 | **html** | `index.html` 及其他 `.html` 文件 |
| 5 | **css** | `style.css` 及其他 `.css` 文件 |
| 6 | **assets** | `screenshot/`、图片、音频、字体等资源文件 |
| 7 | **docs** | `README.md`、`CHANGELOG.md`、`TODO.md`、`INSTRUCTIONS.md`、`docs/` |
| 8 | **config** | `*.json`、`.gitignore`、`start.sh`、`.claude/settings*.json` |
| 9 | **other** | 其他所有文件 |

分组后若某组只有 1 个文件且与相邻组强相关，可合并（由 Claude 判断）。

## 执行步骤

### Step 1 — 扫描变更

```bash
git status --short
```

收集所有 `M`、`A`、`D`、`??` 状态的文件路径。

### Step 2 — 分组并展示计划

按分组策略归类，输出如下格式：

```
📦 分组计划（共 N 组）：

[1/N] classes（3 个文件）
  - classes/Zombie.js
  - classes/Plant.js
  - classes/Projectile.js

[2/N] js（1 个文件）
  - app.js

[3/N] docs（2 个文件）
  - README.md
  - CHANGELOG.md
```

### Step 3 — 处理第一组

**判断"第一组"**：即 `git status` 中仍有变更的最高优先级组（已完成提交的组不再出现在 status 中）。

对该组执行 `/msg` 流程：

1. `git add <该组所有文件路径>`（逐个显式路径，**禁止** `-A`/`.`）
2. `git diff --cached --stat` 确认缓存区
3. `git diff --cached` 查看具体内容
4. `git log --oneline -5` 了解 commit 风格
5. 撰写中文提交消息草稿
6. 生成唯一临时文件名：
   ```bash
   python3 -c "
   import hashlib, subprocess, datetime
   diff = subprocess.check_output(['git','diff','--cached'])
   h = hashlib.sha256(diff).hexdigest()[:6]
   ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
   print(f'/tmp/gitmsg_{ts}_{h}.txt')
   "
   ```
7. 用 Write 工具将消息写入该路径

### Step 4 — 输出并等待

输出格式：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1/N] classes — 提交消息已写入 /tmp/gitmsg_XXXXXXXX_XXXXXX.txt

<消息草稿全文>

执行：
  git commit -F /tmp/gitmsg_20260501_143521_a3f8c1.txt

完成后再次运行 /commit 处理下一组 [2/N] js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

若这是最后一组，替换为"完成后所有变更已提交"。

## 禁止事项

- ❌ 禁止 `git add -A` / `git add .` / `git add --all`
- ❌ 禁止自动执行 `git commit`
- ❌ 禁止一次处理多组（每次调用只处理一组）

## 边界情况

- **缓存区已有内容**：先询问用户是否要先清除（`git restore --staged .`）还是将缓存区内容并入当前组
- **文件跨组**：按优先级表取最高优先级组
- **只有一组**：直接执行，不展示分组计划
