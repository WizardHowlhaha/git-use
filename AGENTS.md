# AGENTS.md

本文件面向在本仓库工作的 coding agent。

## 仓库目的

本仓库发布一个可安装的 `git-use` skill，内容是 Git 提交与 PR 撰写的规范。改动影响用户机器上的安装结果，请保持谨慎。

## 提交规则

本仓库按 [`skill/SKILL.md`](skill/SKILL.md) 提交，使用 `git commit -s`：

- 标题：`<subsystem>: <imperative summary>`，≤ 50 显示列；
- 正文：问题根因与方案，不写验证流水账；
- trailer：`AI-Assisted-By`、`AI-Model`、`Signed-off-by`，顺序固定。

提交前自检：

```sh
git show --format=%B --no-patch HEAD | python3 skill/scripts/check_commit_message.py --require-disclosure -
```

## 改动边界

- 规则文本只改 `skill/SKILL.md` 与 `skill/references/`；`README*` 和 `docs/` 只描述规则，不新增规则。
- 安装器逻辑改 `bin/git-use-install.mjs`；新增 agent 目标时同步更新 `docs/INSTALL.md`、README 的目标表格和 `test/install.test.mjs`。
- 不要把用户机器上的私有路径、账号、内部域名写进仓库内容。

## 验证

```sh
npm test
npm run test:python
```

改动 `skill/` 后，用临时目录演练一次安装：

```sh
node bin/git-use-install.mjs install --all --dest "$(mktemp -d)"
```
