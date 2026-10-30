# git-use

Linux-kernel-style Git commit and PR-content rules packaged as an installable **agent skill**.

The repository is self-contained and ready to publish: the skill payload, a cross-agent installer, a validation script, tests and CI all live here.

## What it enforces

| Area | Constraint |
| --- | --- |
| Commit scope | One commit per feature or module; independent work must be split; never commit half-wired intermediate states |
| AI-generated tests | AI-written tests stay local unless the user explicitly asks to commit them |
| Commit message | `<subsystem>: <imperative summary>`, subject ≤ 50 display columns, body ≤ 75 display columns, one contiguous trailer block |
| Process noise | Commands, test results and `Tested:` paragraphs belong in the chat report, not in the commit message |
| Patch review | Staged patch is reviewed in a fixed order: `--check` → `--name-status/--stat` → full diff → `checkpatch.pl` |
| Commit sign-off | Use `git commit -s` to add the actual signer's `Signed-off-by` in the final trailer block |
| PR content | English title, Chinese body; background → change summary → behaviour notes → per-commit rationale; updating a PR edits the body instead of appending a log |

Full rules: [`skill/SKILL.md`](skill/SKILL.md), [`skill/references/kernel-patch.md`](skill/references/kernel-patch.md), [`skill/references/pull-request.md`](skill/references/pull-request.md). Rationale: [`docs/RULES.md`](docs/RULES.md).

## Install

```sh
# npx, no clone needed
npx --yes github:WizardHowlhaha/git-use install --agent codex

# or the bootstrap script
./install.sh --agent codex
curl -fsSL https://raw.githubusercontent.com/WizardHowlhaha/git-use/main/install.sh | sh -s -- --agent codex
```

| Agent | Flag | Install path | Form |
| --- | --- | --- | --- |
| OpenAI Codex CLI | `--agent codex` | `${CODEX_HOME:-$HOME/.codex}/skills/git-use/` | skill directory |
| Claude Code | `--agent claude` | `$HOME/.claude/skills/git-use/` | skill directory |
| agents.md convention tools | `--agent agents` | `$HOME/.agents/skills/git-use/` | skill directory |
| MiniMax Code (Mavis) | `--agent mavis` | `$HOME/.minimax/skills/git-use/` | skill directory |
| OpenCode | `--agent opencode` | `$HOME/.config/opencode/command/git-use.md` | command |
| Cursor | `--agent cursor` | `$HOME/.cursor/rules/git-use.mdc` | rule (`alwaysApply`) |
| Gemini CLI | `--agent gemini` | `$HOME/.gemini/commands/git-use.toml` | command |

Other commands:

```sh
git-use-skill list                              # status and resolved paths
git-use-skill install --all
git-use-skill install --agent claude --force    # replace an existing install
git-use-skill uninstall --agent cursor --force
```

Manual installation without Node.js, and per-agent notes: [`docs/INSTALL.md`](docs/INSTALL.md).

## Validate a commit message

```sh
git show --format=%B --no-patch HEAD | python3 <skill-dir>/scripts/check_commit_message.py --require-signoff -
```

## Repository layout

```text
skill/                    # the skill payload, copied on install
  SKILL.md
  references/
  scripts/
  agents/openai.yaml
bin/git-use-install.mjs   # cross-agent installer (Node.js >= 18, no dependencies)
install.sh                # bootstrap for local clones and curl pipelines
docs/                     # install guide and rule rationale
test/                     # node:test and unittest suites
```

## Development

```sh
npm test
npm run test:python
```

## License

[MIT](LICENSE). Maintained by WizardHowlhaha.
