#!/usr/bin/env node
/**
 * git-use skill installer.
 *
 * Installs the `git-use` skill into the skill, command or rule directory of
 * the target coding agent. No runtime dependencies; Node.js >= 18 required.
 */

import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_SOURCE = join(ROOT, "skill");
const SKILL_NAME = "git-use";

function homeDir() {
  const home = process.env.HOME?.trim();
  if (!home) throw new Error("HOME must be set to resolve the agent directories");
  return home;
}

/**
 * layout:
 *   skill       - copy the skill directory as-is to <root>/git-use
 *   command-md  - write a single Markdown command file to <root>/git-use.md
 *   command-toml- write a single TOML command file to <root>/git-use.toml
 *   rule-mdc    - write a single Cursor rule file to <root>/git-use.mdc
 */
const AGENTS = [
  {
    id: "codex",
    label: "OpenAI Codex CLI",
    layout: "skill",
    root: () => join(process.env.CODEX_HOME?.trim() || join(homeDir(), ".codex"), "skills"),
    note: "Native skill directory; agents/openai.yaml provides the UI metadata."
  },
  {
    id: "claude",
    label: "Claude Code",
    layout: "skill",
    root: () => join(homeDir(), ".claude", "skills"),
    note: "Native skill directory."
  },
  {
    id: "agents",
    label: "agents.md convention",
    layout: "skill",
    root: () => join(homeDir(), ".agents", "skills"),
    note: "Shared skill directory for tools that follow the agents.md convention."
  },
  {
    id: "mavis",
    label: "MiniMax Code (Mavis)",
    layout: "skill",
    root: () => join(homeDir(), ".minimax", "skills"),
    note: "User-level skill directory of MiniMax Code."
  },
  {
    id: "opencode",
    label: "OpenCode",
    layout: "command-md",
    root: () => join(homeDir(), ".config", "opencode", "command"),
    note: "Custom command; invoke with /git-use."
  },
  {
    id: "cursor",
    label: "Cursor",
    layout: "rule-mdc",
    root: () => join(homeDir(), ".cursor", "rules"),
    note: "Project rule file with alwaysApply enabled."
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    layout: "command-toml",
    root: () => join(homeDir(), ".gemini", "commands"),
    note: "Custom command; invoke with /git-use."
  }
];

function usage() {
  console.log(`Usage:
  git-use-skill list
  git-use-skill install [--agent <id>] [--all] [--dest <directory>] [--force]
  git-use-skill uninstall --agent <id> [--force]

Agents: ${AGENTS.map((agent) => agent.id).join(", ")}

Examples:
  git-use-skill install --agent codex
  git-use-skill install --all
  git-use-skill install --agent claude --dest "$HOME/.claude/skills"
  git-use-skill uninstall --agent cursor --force`);
}

function fail(message) {
  console.error(`git-use-skill: ${message}`);
  process.exitCode = 1;
}

// `git-use-skill list | head` closes the pipe early; exit quietly instead of crashing.
process.stdout.on("error", (error) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});

function parseOptions(args) {
  const options = { force: false, all: false, dest: undefined, agents: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--force" || arg === "-f") {
      options.force = true;
    } else if (arg === "--all") {
      options.all = true;
    } else if (arg === "--dest") {
      options.dest = args[++index];
      if (!options.dest) throw new Error("--dest requires a directory");
    } else if (arg === "--agent" || arg === "-a") {
      const id = args[++index];
      if (!id) throw new Error("--agent requires an agent id");
      options.agents.push(id);
    } else if (arg.startsWith("-")) {
      throw new Error(`unknown option ${arg}`);
    } else {
      options.agents.push(arg);
    }
  }
  return options;
}

function findAgent(id) {
  const agent = AGENTS.find((candidate) => candidate.id === id);
  if (!agent) {
    throw new Error(`unknown agent "${id}"; run list to see supported agents`);
  }
  return agent;
}

function targetPath(agent, dest) {
  const root = dest ? resolve(dest) : agent.root();
  if (agent.layout === "skill") return join(root, SKILL_NAME);
  const extension = { "command-md": "md", "command-toml": "toml", "rule-mdc": "mdc" }[agent.layout];
  return join(root, `${SKILL_NAME}.${extension}`);
}

function parseFrontmatter(contents) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(contents);
  if (!match) throw new Error("SKILL.md is missing YAML frontmatter");
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (field) fields[field[1]] = field[2].trim();
  }
  if (!fields.name) throw new Error("SKILL.md frontmatter is missing name");
  if (!fields.description) throw new Error("SKILL.md frontmatter is missing description");
  return { fields, body: contents.slice(match[0].length).replace(/^\r?\n/, "") };
}

async function assertNoSymlinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`skill source contains a symbolic link: ${file}`);
    if (entry.isDirectory()) await assertNoSymlinks(file);
  }
}

async function loadSkill() {
  const skillFile = join(SKILL_SOURCE, "SKILL.md");
  const contents = await readFile(skillFile, "utf8").catch(() => {
    throw new Error(`cannot read ${skillFile}`);
  });
  const { fields, body } = parseFrontmatter(contents);
  if (fields.name !== SKILL_NAME) {
    throw new Error(`SKILL.md declares name "${fields.name}" but this installer installs "${SKILL_NAME}"`);
  }
  await assertNoSymlinks(SKILL_SOURCE);
  return { fields, body };
}

/**
 * Build a single self-contained document for agents that cannot read a skill
 * directory: the rule body plus both reference files.
 */
async function buildDerivedDocument(skill) {
  const read = (file) => readFile(join(SKILL_SOURCE, file), "utf8");
  const [kernel, pullRequest] = await Promise.all([
    read(join("references", "kernel-patch.md")),
    read(join("references", "pull-request.md"))
  ]);
  const body = skill.body
    .replace(/\[references\/kernel-patch\.md\]\(references\/kernel-patch\.md\)/g, "附录 A（kernel-patch.md）")
    .replace(/\[references\/pull-request\.md\]\(references\/pull-request\.md\)/g, "附录 B（pull-request.md）");
  return [
    "# Git 使用规范（git-use skill）",
    "",
    "> 本文件由 git-use skill 安装器生成，内容与 skill/SKILL.md 保持一致。",
    "> 校验脚本位于 skill 目录的 scripts/check_commit_message.py；仅整目录安装的 agent 可直接调用。",
    "",
    body.trim(),
    "",
    "---",
    "",
    "## 附录 A：references/kernel-patch.md",
    "",
    kernel.trim(),
    "",
    "---",
    "",
    "## 附录 B：references/pull-request.md",
    "",
    pullRequest.trim(),
    ""
  ].join("\n");
}

function tomlEscape(value) {
  return value.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');
}

function tomlString(value) {
  return tomlEscape(value).replace(/"/g, '\\"');
}

async function writeDerivedFile(agent, target, skill, document) {
  const description = skill.fields.description;
  let contents;
  if (agent.layout === "command-toml") {
    contents = [
      `description = "${tomlString(description)}"`,
      "",
      "prompt = \"\"\"",
      tomlEscape(document),
      "\"\"\"",
      ""
    ].join("\n");
  } else if (agent.layout === "rule-mdc") {
    contents = [
      "---",
      `description: ${JSON.stringify(description)}`,
      "alwaysApply: true",
      "---",
      "",
      document,
      ""
    ].join("\n");
  } else {
    contents = [
      "---",
      `description: ${JSON.stringify(description)}`,
      "agent: build",
      "---",
      "",
      document,
      ""
    ].join("\n");
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, "utf8");
}

async function installAgent(agent, { dest, force, skill, document }) {
  const target = targetPath(agent, dest);
  const existing = await stat(target).catch(() => null);

  if (agent.layout === "skill") {
    if (existing && !force) {
      throw new Error(`${agent.id}: ${target} already exists; use --force to replace it`);
    }
    await mkdir(dirname(target), { recursive: true });
    const staging = await mkdtemp(join(tmpdir(), "git-use-"));
    const staged = join(staging, SKILL_NAME);
    try {
      await cp(SKILL_SOURCE, staged, { recursive: true, force: true });
      if (existing) await rm(target, { recursive: true, force: true });
      await rename(staged, target);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
    return target;
  }

  if (existing && !force) {
    throw new Error(`${agent.id}: ${target} already exists; use --force to replace it`);
  }
  await writeDerivedFile(agent, target, skill, document);
  return target;
}

async function uninstallAgent(agent, { dest, force }) {
  const target = targetPath(agent, dest);
  const existing = await stat(target).catch(() => null);
  if (!existing) {
    console.log(`${agent.id}: nothing to remove at ${target}`);
    return null;
  }
  if (!force) {
    throw new Error(`${agent.id}: ${target} exists; use --force to remove it`);
  }
  await rm(target, { recursive: true, force: true });
  return target;
}

async function listAgents(dest) {
  console.log("id\tlayout\tstatus\tpath");
  for (const agent of AGENTS) {
    const target = targetPath(agent, dest);
    const exists = await stat(target).catch(() => null);
    const status = exists ? "installed" : "not installed";
    console.log(`${agent.id}\t${agent.layout}\t${status}\t${target}`);
  }
  console.log("");
  for (const agent of AGENTS) {
    console.log(`${agent.id}: ${agent.label} - ${agent.note}`);
  }
}

async function install(args) {
  const options = parseOptions(args);
  if (options.all && options.agents.length) throw new Error("use either --agent or --all, not both");
  const selected = options.all ? AGENTS : options.agents.map(findAgent);
  if (!selected.length) throw new Error("provide an agent id with --agent or use --all");

  const skill = await loadSkill();
  const document = await buildDerivedDocument(skill);

  const failures = [];
  for (const agent of selected) {
    try {
      const target = await installAgent(agent, { dest: options.dest, force: options.force, skill, document });
      console.log(`installed ${agent.id} -> ${target}`);
    } catch (error) {
      failures.push(error.message);
      console.error(`skipped ${agent.id}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.error("");
    console.error("Some targets were skipped. Re-run with --force to replace existing installations.");
    process.exitCode = 1;
    return;
  }
  console.log("");
  console.log("Next: ask your agent to use the git-use skill, then verify with:");
  console.log(`  git show --format=%B --no-patch HEAD | python3 ${SKILL_NAME}/scripts/check_commit_message.py --require-signoff -`);
}

async function uninstall(args) {
  const options = parseOptions(args);
  if (options.all && options.agents.length) throw new Error("use either --agent or --all, not both");
  const selected = options.all ? AGENTS : options.agents.map(findAgent);
  if (!selected.length) throw new Error("provide an agent id with --agent or use --all");

  const failures = [];
  for (const agent of selected) {
    try {
      const target = await uninstallAgent(agent, { dest: options.dest, force: options.force });
      if (target) console.log(`removed ${agent.id} -> ${target}`);
    } catch (error) {
      failures.push(error.message);
      console.error(`skipped ${agent.id}: ${error.message}`);
    }
  }
  if (failures.length) process.exitCode = 1;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    usage();
    return;
  }
  if (command === "list") {
    const options = parseOptions(args);
    await listAgents(options.dest);
    return;
  }
  if (command === "install") {
    await install(args);
    return;
  }
  if (command === "uninstall") {
    await uninstall(args);
    return;
  }
  throw new Error(`unknown command ${command}`);
}

main().catch((error) => fail(error.message));
