---
name: git-use
description: 用于项目 coding 开发与维护：按功能模块组织 Git 修改、验证和提交；需要提交 Git、创建或更新 PR 时，遵循 Linux 内核风格的 patch、commit message、空白与 trailer 约束，结构化的 PR 内容与排版规则。适用于 Codex、Claude Code、Cursor、Gemini CLI、OpenCode、Mavis 等支持 SKILL.md 的 agent。
---

# Git 使用规范

当任务涉及项目 coding 开发、缺陷修复、重构、测试或维护，并且需要提交 Git 或创建、更新 PR 时使用本 skill。目标是让提交历史清晰对应功能模块，每个提交都尽量是一个完整、可独立验证的功能修改，并能作为干净 patch 审阅、传输和回退；PR 说明应让未参与讨论的评审者理解最终改动、行为变化和提交间的关系。

## 仓库准备

- 修改前先阅读 `AGENTS.md`、仓库贡献规则以及相关构建和测试说明。
- 先检查 `git status --short --branch`、近期提交、当前分支和上游关系，再确定任务开始时的基准 `HEAD`。
- 不得把用户已有修改、生成物、密钥、凭据或无关文件带入提交；保留用户已有修改，不使用 reset、checkout 或其他方式丢弃它们。
- 明确本次提交的文件范围和行为边界。不要因为提交方便而顺手格式化、升级依赖或重写无关文件。

## 修改边界

- 每个提交围绕一个功能模块或一个 feature。一个 feature 跨越多个模块时，提交仍只围绕该 feature，并说明模块之间的契约。
- 独立功能必须拆成独立提交；每个提交应尽量能够单独构建、测试、审阅和回退。
- 不要提交未接通的中间状态。若为了保持中间状态可用而无法拆分，保留最小的完整提交并说明原因。
- 时间统计、日志、重试策略、格式化等具有独立行为的修改，应拆成独立提交，不要与核心功能混在一起。

## AI 生成测试代码的提交范围

- AI 生成的测试代码默认仅用于本地验证，不纳入 Git 提交；只有用户明确要求将这些测试代码一并提交时才纳入。普通的“编写测试”或“提交本次修改”不视为要求提交 AI 生成的测试代码。
- 该规则适用于新增测试文件、测试辅助脚本，以及已有文件中 AI 生成的测试片段。文件混有应提交的改动时，按片段选择性暂存，不按文件名排除用户已有测试。
- 排除提交不等于跳过验证或删除文件：仍需执行必要测试并报告结果，保留本地测试代码；若已暂存，仅取消暂存本次 AI 生成的测试改动。

## Linux 内核式提交信息

提交主题和正文按 [references/kernel-patch.md](references/kernel-patch.md) 编写。硬性要求如下：

- 第一行是 `<subsystem>: <imperative summary>`，主题不超过 50 个显示列，不以句号结尾，不换行。
- 主题后必须有且只有一个空行。正文聚焦问题根因与解决方案，简单修复通常一至两句；仅补充理解改动所必需的触发条件或行为变化，不复述 diff 或展开实现流水账。
- 提交信息不包含过程性信息：检查命令、测试或验证结果、未执行验证的说明，以及 `Tested:`、`Validated with` 等段落。这些内容仅在对话汇报中说明；必要的验证仍须执行。
- 正文普通段落每行不超过 75 个显示列；段落之间只留一个空行；不得有行尾空格、制表符、CRLF 或连续空行。
- trailer 是连续的尾部区块，每行一个 `Key: value`，区块前留一个空行，区块内部不得插入空行或折行。
- `Signed-off-by` 必须是实际签署者，并使用 `git commit -s` 或等价方式生成，不能猜测姓名或邮箱。
- 不添加没有实际审查或签署的 `Reviewed-by`、`Acked-by`、`Co-authored-by` 或其他署名 trailer。

示例：

```text
net: prevent retry loop after peer reset

The reconnect path treated a reset peer as a transient timeout and
requeued the same request without changing state. Stop retrying after the
reset is recorded so the caller receives the original failure.

Signed-off-by: Your Name <your@email.com>
```

提交前可运行入口脚本检查提交信息。脚本位于本 skill 目录下的 `scripts/check_commit_message.py`，路径相对于本 `SKILL.md` 所在目录：

```sh
python3 scripts/check_commit_message.py --require-signoff COMMIT_MSG
```

脚本支持从标准输入读取，便于直接校验提交对象：

```sh
git show --format=%B --no-patch HEAD | python3 scripts/check_commit_message.py --require-signoff -
```

## 提交前 patch 检查

暂存后、提交前按以下顺序检查；具体命令和适用条件见 [references/kernel-patch.md](references/kernel-patch.md)：

1. `git diff --cached --check`：拒绝行尾空格、空白错误和冲突标记。
2. `git diff --cached --name-status`、`git diff --cached --stat`：确认文件范围、删除内容、生成物和敏感文件，并检查 AI 生成的测试代码是否按上述规则排除。
3. `git diff --cached --no-ext-diff --unified=3`：逐段审阅实际 patch，确认上下文、缩进、换行和错误处理。
4. 若仓库存在 `scripts/checkpatch.pl`，运行 `git diff --cached --no-ext-diff --unified=3 | perl scripts/checkpatch.pl --no-tree --strict -`；按仓库规则处理报告，不要为了清零而隐藏真实问题。
5. 运行与变更直接相关的测试和构建检查；测试失败、未运行或存在已知风险时，在最终说明中如实记录。
6. 用提交信息检查脚本验证标题、正文、空白和 trailer；不要把验证日志复制进提交正文。

提交后检查：

```sh
git show --check --stat --oneline HEAD
git show --format=%B --no-patch HEAD | python3 scripts/check_commit_message.py --require-signoff -
git status --short --branch
```

## 提交流程

1. 检查状态和历史，确定 feature 边界与基准 `HEAD`。
2. 只实现并验证该 feature，完成上面的 staged patch 检查。
3. 只暂存相关路径或片段，默认不要暂存整个工作区；AI 生成的测试代码按上述规则排除。
4. 检查 `git diff --cached` 和提交信息；确认 `Signed-off-by` 和 trailer 区块格式完整。
5. 使用 `git commit -s` 创建提交。若仓库已有提交钩子或维护者额外要求，优先遵循仓库规则。
6. 创建提交后运行提交后检查，并确认工作区没有意外文件。

用户要求按模块或 feature 提交时，对每个独立提交重复以上流程，并报告提交 ID、模块范围、实际执行的验证和剩余风险。

## PR 创建与更新

创建或更新 PR 时，读取 [references/pull-request.md](references/pull-request.md)，按其中规定的标题语言、内容结构、Markdown 排版和发布核对要求撰写。

- 默认使用英文标题、中文正文，以“背景与目标 → 改动汇总 → 按需补充的行为说明 → 各提交的主要改动与前置关系”组织内容。用户明确要求和目标仓库模板优先，简单改动省略不适用章节。
- 内容以最终 base/head 差异和实际提交为依据；准确说明前后行为、适用条件、默认值及依赖关系，不复制参考材料的业务事实、指标或提交 SHA。
- 更新已有 PR 时先读取线上正文，保留用户的有效编辑。新增修复或范围变化必须同步更新受影响的“背景与目标”“改动汇总”（概括句及表格）、相关行为说明和提交清单；标题不再覆盖最终范围时一并调整。禁止只追加 commit 描述或在末尾补一段说明。
- PR 中每个提交条目通常用一至两句说明根因与解决方案，仅在必要时补充前置关系；不写测试命令、验证结果、测试数量、日志回放过程或未执行验证的说明。验证结果在对话中汇报；用户明确要求或仓库模板要求时，放在独立验证章节。
- PR 正文与 commit message 分别编写，不机械套用提交信息的行宽或 trailer；量化结论必须有对应依据。PR 文案调整不自动授权重写已推送的 Git 历史；明确要求修改 Git 提交信息时再处理提交历史。
- 创建或更新时优先使用结构化工具的正文参数；使用 `gh` 时将 Markdown 写入临时文件并通过 `--body-file` 传入。发布后读取实际标题和正文，逐节核对新增行为、提交范围及 Markdown 排版；平台支持时将 PR 关联到当前任务。
