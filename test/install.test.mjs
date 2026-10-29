import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "bin/git-use-install.mjs");

function run(args) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

async function withTempDir(runIn) {
  const destination = await mkdtemp(join(tmpdir(), "git-use-test-"));
  try {
    return await runIn(destination);
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
}

test("install copies the skill directory with all supporting files", async () => {
  await withTempDir(async (destination) => {
    const result = await run(["install", "--agent", "codex", "--dest", destination]);
    assert.equal(result.code, 0, result.stderr);

    const skill = await readFile(join(destination, "git-use/SKILL.md"), "utf8");
    assert.match(skill, /^name: git-use$/m);
    assert.match(skill, /Linux 内核式提交信息/);

    for (const file of [
      "git-use/references/kernel-patch.md",
      "git-use/references/pull-request.md",
      "git-use/scripts/check_commit_message.py",
      "git-use/agents/openai.yaml"
    ]) {
      assert.ok(await stat(join(destination, file)), `${file} should be installed`);
    }
  });
});

test("install refuses to overwrite an existing skill without --force", async () => {
  await withTempDir(async (destination) => {
    const first = await run(["install", "--agent", "claude", "--dest", destination]);
    assert.equal(first.code, 0, first.stderr);

    const second = await run(["install", "--agent", "claude", "--dest", destination]);
    assert.notEqual(second.code, 0);
    assert.match(second.stderr, /--force/);
  });
});

test("install replaces an existing skill with --force", async () => {
  await withTempDir(async (destination) => {
    await run(["install", "--agent", "claude", "--dest", destination]);
    const result = await run(["install", "--agent", "claude", "--dest", destination, "--force"]);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /installed claude/);
  });
});

test("cursor target writes a self-contained alwaysApply rule", async () => {
  await withTempDir(async (destination) => {
    const result = await run(["install", "--agent", "cursor", "--dest", destination]);
    assert.equal(result.code, 0, result.stderr);

    const rule = await readFile(join(destination, "git-use.mdc"), "utf8");
    assert.match(rule, /^---$/m);
    assert.match(rule, /^alwaysApply: true$/m);
    assert.match(rule, /附录 A：references\/kernel-patch\.md/);
    assert.match(rule, /附录 B：references\/pull-request\.md/);
    assert.doesNotMatch(rule, /\]\(references\/kernel-patch\.md\)/);
  });
});

test("gemini target writes a TOML command with an escaped prompt", async () => {
  await withTempDir(async (destination) => {
    const result = await run(["install", "--agent", "gemini", "--dest", destination]);
    assert.equal(result.code, 0, result.stderr);

    const command = await readFile(join(destination, "git-use.toml"), "utf8");
    assert.match(command, /^description = "/m);
    assert.match(command, /^prompt = """$/m);
    assert.match(command, /"""$/m);
    assert.match(command, /## 背景与目标/);

    // A trailing backslash would continue the line inside a TOML multi-line string.
    for (const line of command.split("\n")) {
      const trailing = /(\\+)$/.exec(line);
      assert.ok(!trailing || trailing[1].length % 2 === 0, `unexpected line continuation: ${line}`);
    }
  });
});

test("opencode target writes a markdown command with frontmatter", async () => {
  await withTempDir(async (destination) => {
    const result = await run(["install", "--agent", "opencode", "--dest", destination]);
    assert.equal(result.code, 0, result.stderr);

    const command = await readFile(join(destination, "git-use.md"), "utf8");
    assert.match(command, /^agent: build$/m);
    assert.match(command, /# Git 使用规范/);
  });
});

test("unknown agents are rejected with the supported list", async () => {
  const result = await run(["install", "--agent", "not-an-agent"]);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /unknown agent/);
});

test("list reports every supported agent and its installation status", async () => {
  await withTempDir(async (destination) => {
    const result = await run(["list", "--dest", destination]);
    assert.equal(result.code, 0, result.stderr);
    for (const agent of ["codex", "claude", "agents", "mavis", "opencode", "cursor", "gemini"]) {
      assert.match(result.stdout, new RegExp(`^${agent}\\t`, "m"), `${agent} should be listed`);
    }
    assert.match(result.stdout, /not installed/);
  });
});

test("uninstall removes an installation only with --force", async () => {
  await withTempDir(async (destination) => {
    await run(["install", "--agent", "cursor", "--dest", destination]);

    const refused = await run(["uninstall", "--agent", "cursor", "--dest", destination]);
    assert.notEqual(refused.code, 0);
    assert.match(refused.stderr, /--force/);

    const removed = await run(["uninstall", "--agent", "cursor", "--dest", destination, "--force"]);
    assert.equal(removed.code, 0, removed.stderr);
    assert.equal(await stat(join(destination, "git-use.mdc")).catch(() => null), null);
  });
});
