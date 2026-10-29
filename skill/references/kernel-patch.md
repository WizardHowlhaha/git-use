# Linux Kernel Patch 约束

本参考用于提交信息和 staged patch 的最终检查。仓库自身的贡献规则、维护者要求和 CI 规则优先于这些通用约束。

## 提交信息

- Subject 第一行建议不超过 50 个显示列，使用模块前缀、冒号、空格和祈使句；不要在末尾加句号。
- Subject 后放一个空行。正文优先用一至两句说明问题根因与解决方案；复杂改动只补充理解方案所必需的边界或取舍，不重复 diff，也不写“把变量改成 X”式流水账。
- 正文普通行不超过 75 个显示列。长 URL、路径或代码标识应换到独立行，不能用多余空格凑宽度。
- 文件使用 LF 换行，提交信息末尾保留一个换行；不得有 CRLF、行尾空格、制表符或连续空行。
- Trailer 放在正文末尾的连续区块中。每行一个 `Key: value`，前面只有一个空行，区块中不插入空行，不折行。
- `Signed-off-by` 表示真实的 Developer Certificate of Origin 签署。只有实际签署者可以添加自己的姓名和邮箱；使用 `git commit -s`。

检查命令、测试或验证结果、未执行验证的说明等过程性信息仅在对话汇报中说明，不写入提交信息。验证要求仍按 SKILL.md 执行。

## 暂存 patch

```sh
git diff --cached --check
git diff --cached --name-status
git diff --cached --stat
git diff --cached --no-ext-diff --unified=3
```

`git diff --cached --check` 发现的 whitespace error、冲突标记和新增空白行必须处理或由仓库规则明确豁免。不要只检查 `git diff`，因为未暂存 diff 不是将要提交的 patch。

如果仓库包含 Linux 风格的检查器：

```sh
git diff --cached --no-ext-diff --unified=3 \
  | perl scripts/checkpatch.pl --no-tree --strict -
```

仅在 `scripts/checkpatch.pl` 存在且仓库接受该检查器时运行；第三方仓库的自定义格式检查优先。

## 提交后

下面的 `scripts/check_commit_message.py` 位于本 skill 目录中，路径相对于本文件所在的 `references/` 目录（即 `../scripts/check_commit_message.py`）：

```sh
git show --check --stat --oneline HEAD
git show --format=format:%B --no-patch HEAD \
  | python3 scripts/check_commit_message.py --require-disclosure -
```

`git show --check` 用于确认最终提交的 patch 没有空白错误；提交信息检查用于确认 rebase、钩子或编辑器没有破坏标题、正文或 trailer。
