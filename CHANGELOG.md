# Changelog

本文件记录 `git-use` skill 的重要变更，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

### 变更

- 移除提交信息中的 AI 辅助披露要求及相关示例，保留真实的 `Signed-off-by` 签署。
- 提交检查参数由 `--require-disclosure` 改为 `--require-signoff`，只要求签署 trailer；同步更新安装提示、文档和 CI。

## [1.0.0] - 2026-10-29

首个公开版本。规则来自内部使用的 `git-use` skill，本次整理为独立、可公开发布的 skill 仓库。

### 新增

- `skill/SKILL.md`：规则入口，覆盖提交边界、AI 生成测试的提交范围、内核风格提交信息、staged patch 检查、提交流程、PR 内容与 AI 披露。
- `skill/references/kernel-patch.md`：提交信息与暂存 patch 的细则。
- `skill/references/pull-request.md`：PR 标题语言、内容结构、Markdown 排版与发布核对要求。
- `skill/scripts/check_commit_message.py`：提交信息校验脚本，支持文件参数与标准输入。
- `skill/agents/openai.yaml`：Codex 界面元数据。
- `bin/git-use-install.mjs`：跨 agent 安装器，支持 `codex`、`claude`、`agents`、`mavis`、`opencode`、`cursor`、`gemini` 七种目标。
- `install.sh`：安装引导脚本，支持本地克隆与 `curl | sh` 管道安装。
- `test/`：安装器测试（node:test）与校验脚本测试（unittest）。
- `.github/workflows/ci.yml`：Node.js 18/20/22 与 Python 3.9/3.12 的持续集成。

### 变更

- 脚本路径改为相对 skill 目录，规则文档不再假设固定的 `skills/git-use/` 布局。
- AI 披露示例中的 agent 名称与模型标识改为占位符，并补充“优先使用运行时暴露的模型标识”的取值为准的说明。
- PR 规范的来源描述改为通用表述，移除内部系统地址与具体 PR 编号。
- 提交信息示例移除 `Tested:` 段落，与“提交信息不包含过程性信息”的规则保持一致。

### 修复

- 校验脚本在逐行检查前归一化尾部换行。`git log --format=%B` 与 `git show --format=%B` 会在存储的消息之后多输出一个换行，原实现会让本文档给出的提交后检查命令恒定失败。
