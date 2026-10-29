#!/bin/sh
#
# git-use skill installer.
#
#   ./install.sh --agent codex
#   curl -fsSL https://raw.githubusercontent.com/WizardHowlhaha/git-use/main/install.sh | sh -s -- --agent claude
#
# Requires Node.js >= 18. The script installs the skill into the directory of
# the target coding agent; see docs/INSTALL.md for the per-agent matrix.

set -eu

REPO_URL="${GIT_USE_REPO_URL:-https://github.com/WizardHowlhaha/git-use}"
REF="${GIT_USE_REF:-main}"

die() {
  echo "git-use: $*" >&2
  exit 1
}

if ! command -v node >/dev/null 2>&1; then
  die "node is required (Node.js >= 18). See docs/INSTALL.md for the manual install path."
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" 2>/dev/null && pwd || echo "")

cleanup() {
  if [ -n "${STAGING_DIR:-}" ] && [ -d "$STAGING_DIR" ]; then
    rm -rf "$STAGING_DIR"
  fi
}

download_repo() {
  command -v tar >/dev/null 2>&1 || die "tar is required to download the repository"

  if command -v curl >/dev/null 2>&1; then
    fetch() { curl -fsSL "$1" -o "$2"; }
  elif command -v wget >/dev/null 2>&1; then
    fetch() { wget -qO "$2" "$1"; }
  else
    die "curl or wget is required to download the repository"
  fi

  STAGING_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t git-use)
  trap cleanup EXIT INT TERM

  archive="$STAGING_DIR/repo.tar.gz"
  fetch "$REPO_URL/archive/refs/heads/$REF.tar.gz" "$archive" \
    || die "cannot download $REPO_URL at ref $REF"

  tar -xzf "$archive" -C "$STAGING_DIR" || die "cannot extract the downloaded archive"

  extracted=$(find "$STAGING_DIR" -maxdepth 1 -mindepth 1 -type d -not -name "$(basename "$STAGING_DIR")" | head -n 1)
  [ -n "$extracted" ] || die "the downloaded archive does not contain the repository"
  [ -f "$extracted/skill/SKILL.md" ] || die "the downloaded archive does not contain skill/SKILL.md"

  REPO_DIR="$extracted"
}

# A local checkout is used as-is; a piped download always fetches the release.
if [ -n "$SCRIPT_DIR" ] && [ -f "$0" ] && [ -f "$SCRIPT_DIR/skill/SKILL.md" ]; then
  REPO_DIR="$SCRIPT_DIR"
else
  download_repo
fi

# `./install.sh --agent codex` is shorthand for `./install.sh install --agent codex`.
case "${1:-}" in
  ""|install|list|uninstall) ;;
  *) set -- install "$@" ;;
esac

exec node "$REPO_DIR/bin/git-use-install.mjs" "$@"
