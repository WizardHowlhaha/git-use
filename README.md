# git-use

把一套 Git 提交与 PR 撰写规范做成可安装的 **agent skill**：按功能模块拆分提交、采用 Linux 内核风格的 commit message 与空白/trailer 约束、按结构化模板撰写 PR。

仓库是自包含的公开 skill 仓库：包含 skill 本体、跨 agent 安装器、校验脚本、测试和 CI，可直接发布并被不同 coding agent 安装使用。

## 规则覆盖范围

| 主题 | 关键约束 |
| --- | --- |
| 提交边界 | 一个提交对应一个功能模块或 feature；独立功能必须拆开；不提交未接通的中间状态 |
| AI 测试代码 | AI 生成的测试默认只用于本地验证，不纳入提交，除非用户明确要求 |
| Commit message | `<subsystem>: <imperative summary>`，主题 ≤ 50 显示列；正文 ≤ 75 显示列；trailer 位于正文末尾的连续区块 |
| 过程信息 | 检查命令、测试结果、`Tested:` 段落只写进对话汇报，不写进提交信息 |
| Patch 检查 | 暂存后按 `git diff --cached --check` → `--name-status/--stat` → 完整 diff → `checkpatch.pl` 顺序逐项审阅 |
| 提交签署 | 使用 `git commit -s` 生成真实签署者的 `Signed-off-by`，位于正文末尾连续区块 |
| PR 内容 | 英文标题 + 中文正文；背景与目标 → 改动汇总 → 行为说明 → 各提交改动与前置关系；更新 PR 必须同步正文而非追加日志 |

完整规则见 [`skill/SKILL.md`](skill/SKILL.md)，提交信息细则见 [`skill/references/kernel-patch.md`](skill/references/kernel-patch.md)，PR 排版细则见 [`skill/references/pull-request.md`](skill/references/pull-request.md)，规则取舍说明见 [`docs/RULES.md`](docs/RULES.md)。

## 安装

安装器支持不同 agent 的目录结构：能读取 skill 目录的 agent 安装整个 `skill/` 目录；只支持命令或规则的 agent 安装一份自包含的等价文件。

```sh
# npx（无需克隆仓库）
npx --yes github:WizardHowlhaha/git-use install --agent codex

# 或用安装脚本
./install.sh --agent codex
curl -fsSL https://raw.githubusercontent.com/WizardHowlhaha/git-use/main/install.sh | sh -s -- --agent codex
```

支持的 agent 与安装位置：

| Agent | 参数 | 安装位置 | 形式 |
| --- | --- | --- | --- |
| OpenAI Codex CLI | `--agent codex` | `${CODEX_HOME:-$HOME/.codex}/skills/git-use/` | skill 目录 |
| Claude Code | `--agent claude` | `$HOME/.claude/skills/git-use/` | skill 目录 |
| agents.md 约定工具 | `--agent agents` | `$HOME/.agents/skills/git-use/` | skill 目录 |
| MiniMax Code (Mavis) | `--agent mavis` | `$HOME/.minimax/skills/git-use/` | skill 目录 |
| OpenCode | `--agent opencode` | `$HOME/.config/opencode/command/git-use.md` | 命令 |
| Cursor | `--agent cursor` | `$HOME/.cursor/rules/git-use.mdc` | 规则（alwaysApply） |
| Gemini CLI | `--agent gemini` | `$HOME/.gemini/commands/git-use.toml` | 命令 |

其他命令：

```sh
git-use-skill list                          # 查看各 agent 的安装状态与路径
git-use-skill install --all                 # 一次装到所有已知 agent
git-use-skill install --agent claude --force   # 覆盖已有安装
git-use-skill uninstall --agent cursor --force  # 卸载
```

不依赖 Node.js 的手工安装方式和其他细节见 [`docs/INSTALL.md`](docs/INSTALL.md)。

## 安装后

agent 会在涉及提交 Git、创建或更新 PR 时自动加载该 skill；也可以显式要求：

- Codex：`$git-use`
- Claude Code / OpenCode / Gemini CLI：`/git-use`
- Cursor：规则文件对所有会话生效

校验提交信息（`<skill-dir>` 为安装后的 skill 目录）：

```sh
git show --format=%B --no-patch HEAD | python3 <skill-dir>/scripts/check_commit_message.py --require-signoff -
```

## 仓库结构

```text
skill/                    # skill 本体，安装时复制这一目录
  SKILL.md                # 规则入口
  references/             # 提交信息细则与 PR 排版细则
  scripts/                # 提交信息校验脚本
  agents/openai.yaml      # Codex 界面元数据
bin/git-use-install.mjs   # 跨 agent 安装器（Node.js >= 18，无依赖）
install.sh                # 安装引导脚本（本地克隆或 curl 管道）
docs/                     # 安装指南与规则说明
test/                     # 安装器测试（node:test）与校验脚本测试（unittest）
```

## 开发

```sh
npm test          # node --test test/*.test.mjs
npm run test:python   # python3 -m unittest discover -s test
```

本仓库自身按 `skill/SKILL.md` 的规则提交：内核风格 subject、连续 trailer 区块、`git commit -s` 签署。

## 许可

[MIT](LICENSE)。本仓库由 WizardHowlhaha 维护。
