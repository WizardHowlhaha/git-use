# 贡献指南

## 开发环境

```sh
git clone https://github.com/WizardHowlhaha/git-use.git
cd git-use
npm test              # 安装器测试
npm run test:python   # 校验脚本测试
```

不需要 `npm install`：安装器和测试都只用 Node.js 内置模块。

## 目录约定

```text
skill/          # skill 本体；只有这一目录的内容会被安装到用户机器
bin/            # 安装器
install.sh      # 安装引导脚本
docs/           # 安装指南与规则说明
test/           # 测试
```

改动规则时，规则文本只改 `skill/SKILL.md` 与 `skill/references/`；`docs/RULES.md` 解释取舍，不重复规则本身。

## 提交规范

本仓库自身遵循 `skill/SKILL.md`：

- 提交标题为 `<subsystem>: <imperative summary>`，不超过 50 显示列；
- 正文说明问题与方案，不写测试命令与验证结果；
- trailer 位于正文末尾的连续区块，使用 `git commit -s` 生成真实签署者的 `Signed-off-by`。

提交前可以自检：

```sh
git show --format=%B --no-patch HEAD | python3 skill/scripts/check_commit_message.py --require-signoff -
```

## 修改规则时的注意事项

- `skill/SKILL.md` 的 frontmatter 必须保留 `name` 和 `description`，`description` 要写清触发条件，否则 agent 不会自动加载。
- `description` 必须是单行；换行会破坏部分 agent 的解析。
- 新增 reference 文件时，同时在 `bin/git-use-install.mjs` 的 `buildDerivedDocument()` 中加入，否则命令/规则形式的安装会缺少这部分内容。
- 改动 `skill/` 后运行 `npm test && npm run test:python`，并用 `--dest` 指向临时目录做一次安装演练。

## 发布

1. 更新 `CHANGELOG.md` 与 `package.json` 的版本号。
2. 打标签并推送：`git tag -a v<version> -m "release v<version>" && git push --follow-tags`。
3. 发布后的默认分支即为 `install.sh` 的下载来源；如需切换分支，用 `GIT_USE_REF` 覆盖。
