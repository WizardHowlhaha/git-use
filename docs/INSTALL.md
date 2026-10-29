# 安装指南

## 前置条件

| 依赖 | 用途 | 最低版本 |
| --- | --- | --- |
| Node.js | 运行安装器 `bin/git-use-install.mjs` | 18 |
| Python 3 | 运行提交信息校验脚本 `skill/scripts/check_commit_message.py` | 3.8 |
| git | 使用被安装的规则本身 | 2.20 |

只想使用规则、不需要安装器时，可以跳过 Node.js，直接按下面的“手工安装”复制目录。

## 三种安装方式

### 1. npx（无需克隆仓库）

```sh
npx --yes github:WizardHowlhaha/git-use install --agent codex
```

`github:` 形式直接从 GitHub 拉取仓库并执行包里的 `bin`，不需要 npm 付费账号，也不需要发布到 npm registry。

### 2. 安装脚本

本地克隆后：

```sh
./install.sh --agent claude
```

或者管道安装（脚本会下载仓库压缩包到临时目录再执行）：

```sh
curl -fsSL https://raw.githubusercontent.com/WizardHowlhaha/git-use/main/install.sh | sh -s -- --agent claude
```

管道安装可用环境变量覆盖仓库地址和分支：

```sh
GIT_USE_REPO_URL=https://github.com/<owner>/<repo> GIT_USE_REF=main \
  curl -fsSL https://raw.githubusercontent.com/WizardHowlhaha/git-use/main/install.sh | sh -s -- --agent claude
```

### 3. 手工安装

把仓库中的 `skill/` 目录复制成目标 agent 的 skill 目录即可：

```sh
mkdir -p "$HOME/.codex/skills"
cp -R /path/to/git-use/skill "$HOME/.codex/skills/git-use"
```

skill 目录必须保持完整结构（`SKILL.md`、`references/`、`scripts/`），因为 SKILL.md 内部使用相对路径引用它们。

## 各 agent 的安装位置与触发方式

| Agent | 参数 | 安装位置 | 触发方式 | 是否需要重启 |
| --- | --- | --- | --- | --- |
| OpenAI Codex CLI | `--agent codex` | `${CODEX_HOME:-$HOME/.codex}/skills/git-use/` | `$git-use` 或自动触发 | 需要重启会话 |
| Claude Code | `--agent claude` | `$HOME/.claude/skills/git-use/` | `/git-use` 或自动触发 | 需要重启会话 |
| agents.md 约定工具 | `--agent agents` | `$HOME/.agents/skills/git-use/` | 取决于具体工具 | 视工具而定 |
| MiniMax Code (Mavis) | `--agent mavis` | `$HOME/.minimax/skills/git-use/` | 自动触发 | 需要重启会话 |
| OpenCode | `--agent opencode` | `$HOME/.config/opencode/command/git-use.md` | `/git-use` | 需要重启会话 |
| Cursor | `--agent cursor` | `$HOME/.cursor/rules/git-use.mdc` | 规则对所有会话生效 | 需要重启会话 |
| Gemini CLI | `--agent gemini` | `$HOME/.gemini/commands/git-use.toml` | `/git-use` | 需要重启会话 |

安装为命令或规则的 agent（OpenCode、Cursor、Gemini CLI）拿到的是一份**自包含**文件：规则正文加上两个 reference 文件的内容都内联其中，相对路径引用被替换为附录标题。这类安装不提供 `scripts/check_commit_message.py`，需要校验脚本时请改用 skill 目录安装，或手动复制 `skill/scripts/` 到本机任意位置。

## 自定义安装目录

`--dest` 覆盖安装根目录：

```sh
git-use-skill install --agent claude --dest "$HOME/.claude/skills"
git-use-skill install --agent cursor --dest "$PWD/.cursor/rules"
```

skill 目录形式的 agent 会安装到 `<dest>/git-use/`；命令和规则形式的 agent 会写入 `<dest>/git-use.md`、`<dest>/git-use.toml` 或 `<dest>/git-use.mdc`。

## 覆盖与卸载

已有安装默认不会被覆盖：

```sh
git-use-skill install --agent codex --force
```

卸载同样需要显式确认：

```sh
git-use-skill uninstall --agent cursor --force
```

`git-use-skill list` 会打印每个 agent 的安装状态与解析后的绝对路径。

## 验证安装

```sh
# 1. 目录或文件存在
ls -R "$HOME/.codex/skills/git-use"

# 2. 校验脚本可用
python3 "$HOME/.codex/skills/git-use/scripts/check_commit_message.py" --help

# 3. 用一个真实提交做端到端校验
cd /path/to/your/repo
git show --format=%B --no-patch HEAD \
  | python3 "$HOME/.codex/skills/git-use/scripts/check_commit_message.py" --require-disclosure -
```

第三条输出 `commit-message: OK` 表示标题、正文宽度、空白和 trailer 都符合规则。

## 故障排查

**安装器报 `node is required`**：安装 Node.js 18 或更高版本，或改用手工安装。

**安装器报 `already exists; use --force`**：目标目录已有旧版本，确认后加 `--force` 覆盖。

**agent 没有发现 skill**：确认安装路径与该 agent 的实际目录一致（例如设置了 `CODEX_HOME` 时 Codex 不读 `$HOME/.codex`），并重启会话。

**校验脚本报 `CRLF is not allowed`**：提交信息里混入了 CRLF，检查编辑器或 Git 配置中的换行符设置。

**校验脚本报 `required trailer is missing`**：提交缺少 `AI-Assisted-By`、`AI-Model`、`Signed-off-by` 之一，按 SKILL.md 的顺序补齐。

## 从源码安装（开发用）

```sh
git clone https://github.com/WizardHowlhaha/git-use.git
cd git-use
npm test
node bin/git-use-install.mjs install --agent codex --dest "$HOME/.codex/skills"
```
